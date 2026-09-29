// Run with `npm run test:browser`; requires the local ego-browser CLI.
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const root = path.join(process.cwd());
const require = createRequire(path.join(root, "package.json"));
const ts = require("typescript");
async function compile(file) {
  const source = (await fs.readFile(path.join(root, file), "utf8"))
    .replace(/^import[\s\S]*?from\s+["'][^"']+["'];\n/gm, "")
    .replace(/\bexport\s+/g, "");
  return ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None },
  }).outputText;
}
const source = `${await compile("shared/models.ts")}\n${await compile("client/model-visibility-web.ts")}`;
async function runBrowser(source, space) {
  const assert = (await import("node:assert/strict")).default;
  const task = await taskSpace(space);
  console.log({ spaceId: task.spaceId });
  const page = task.page("p1");
  await page.goto("about:blank");
  await page.cdp("Page.bringToFront", {});
  const result = await page.evaluate(async (source) => {
    document.body.innerHTML = `<div data-testid="model-provider-codex"><span dir="auto">Codex</span><span dir="auto" style="font-size:12px" aria-label="host count">7 models</span></div>
      <div><button data-testid="model-row-codex-gpt-5.5">Hidden model</button></div>`;
    const count = document.querySelector('[data-testid="model-provider-codex"] span:last-child');
    const originalNode = count.firstChild;
    const stats = { microtasks: 0, capped: false, mutations: 0, frames: 0, cancelled: 0 };
    // Drive frames explicitly: hidden browser tabs suspend native animation frames.
    const pendingFrames = new Map();
    let frameId = 0;
    const queue = (fn) => {
      if (++stats.microtasks <= 200) window.queueMicrotask(fn);
      else stats.capped = true;
    };
    const frame = (fn) => {
      stats.frames++;
      pendingFrames.set(++frameId, fn);
      return frameId;
    };
    const cancelFrame = (id) => {
      stats.cancelled++;
      pendingFrames.delete(id);
    };
    const observer = new MutationObserver((records) => stats.mutations += records.length);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    const create = new Function(
      "Platform", "getHiddenModels", "knownModelIds", "providerIdForTitle", "refreshProviders",
      "setModelVisible", "subscribeModelVisibility", "queueMicrotask", "requestAnimationFrame",
      "cancelAnimationFrame", "getModelVisibilityHostId", `${source}\nreturn installModelVisibilityWeb();`,
    );
    function install(ids) {
      let hidden = ids.map((modelId) => ({ provider: "codex", modelId }));
      let listener;
      const cleanup = create(
        { OS: "web" }, () => hidden, () => undefined, () => null, () => {}, () => {},
        (fn) => { listener = fn; return () => { listener = null; }; }, queue, frame, cancelFrame, () => null,
      );
      return {
        cleanup,
        update(ids) {
          hidden = ids.map((modelId) => ({ provider: "codex", modelId }));
          listener?.();
        },
      };
    }
    async function settle() {
      for (let i = 0; i < 4; i++) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        const callbacks = [...pendingFrames.values()];
        pendingFrames.clear();
        for (const callback of callbacks) callback(performance.now());
      }
    }
    function view() {
      return {
        text: count.textContent,
        label: count.getAttribute("aria-label"),
        shown: count.getAttribute("data-mono-count-shown"),
        content: getComputedStyle(count, "::after").content,
        fontSize: getComputedStyle(count, "::after").fontSize,
        sameNode: count.firstChild === originalNode,
      };
    }
    const hidden = ["gpt-5.5", "gpt-5.6-luna", "gpt-5.6-terra", "gpt-5.6-sol"];
    const a = install(hidden);
    const b = install([]);
    await settle();
    const initial = view();
    const stableFrames = stats.frames;
    await settle();
    const converged = stats.frames === stableFrames;
    const hiddenRow = getComputedStyle(document.querySelector('[data-testid="model-row-codex-gpt-5.5"]')).display;
    count.firstChild.nodeValue = "12 models";
    await settle();
    const updated = view();
    b.update(["gpt-5.5"]);
    await settle();
    // Publish unchanged settings once more: only B queues a frame, so it owns the label.
    b.update(["gpt-5.5"]);
    await settle();
    const secondHost = view();
    a.cleanup();
    await settle();
    const survivingHost = view();
    b.update([]);
    await settle();
    const restored = view();
    // A settings notification queues a frame; unloading must cancel it.
    b.update(["gpt-5.5"]);
    b.cleanup();
    await settle();
    observer.disconnect();
    return {
      initial, updated, secondHost, survivingHost, restored, hiddenRow, converged, stats,
      clean: !document.querySelector('[data-mono-owned], [data-mono-count-shown], [data-mono-count-owner]')
        && count.style.getPropertyValue("--mono-model-count-font-size") === "",
    };
  }, source);
  assert.equal(result.stats.capped, false, "multiple instances must not starve the microtask queue");
  assert.equal(result.converged, true, "observer notifications must settle");
  assert.equal(result.initial.text, "7 models");
  assert.equal(result.initial.sameNode, true, "React's text node must remain intact");
  assert.equal(result.initial.shown, "3 models");
  assert.equal(result.initial.content, '"3 models"');
  assert.equal(result.initial.fontSize, "12px");
  assert.equal(result.hiddenRow, "none");
  assert.equal(result.updated.text, "12 models");
  assert.equal(result.updated.shown, "8 models");
  assert.equal(result.secondHost.shown, "11 models");
  assert.equal(result.survivingHost.shown, "11 models", "unloading another host must preserve the owner's overlay");
  assert.equal(result.restored.text, "12 models");
  assert.equal(result.restored.shown, null);
  assert.equal(result.restored.label, "host count");
  assert.equal(result.clean, true);
  assert.ok(result.stats.cancelled > 0, "unloading must cancel the queued frame");
  console.log("PASS model visibility: multi-host convergence, host text update, CSS, accessibility, cleanup", result.stats);
  const switches = await page.evaluate(async (source) => {
    document.body.innerHTML = `<div data-testid="provider-settings-sheet"><div role="dialog">
      <span dir="auto">Cursor</span><div id="models"></div></div></div>`;
    const list = document.querySelector("#models");
    const models = ["auto-smart", "grok-4.7", "grok-4.6", "composer-2.5"];
    function add(id) {
      const row = document.createElement("div"); row.setAttribute("data-model-id", id);
      row.innerHTML = `<span dir="auto">${id}</span><span data-pmono="">${id}</span>`;
      list.append(row); return row;
    }
    models.forEach(add);
    const frames = new Map(); let frameId = 0;
    const frame = (fn) => { frames.set(++frameId, fn); return frameId; };
    const route = { location: { pathname: "/settings/hosts/local/providers", hash: "" } };
    const create = new Function(
      "Platform", "getHiddenModels", "knownModelIds", "providerIdForTitle", "refreshProviders",
      "setModelVisible", "subscribeModelVisibility", "requestAnimationFrame", "cancelAnimationFrame",
      "getModelVisibilityHostId", "window", `${source}\nreturn installModelVisibilityWeb();`,
    );
    function install(hostId, ids) {
      let hidden = ids.map((modelId) => ({ provider: "cursor", modelId })); let listener;
      const writes = [];
      const cleanup = create({ OS: "web" }, () => hidden, () => new Set(models),
        (title) => title === "Cursor" ? "cursor" : null, () => {},
        (ref, visible) => {
          writes.push({ ...ref, visible });
          hidden = hidden.filter((item) => item.modelId !== ref.modelId);
          if (!visible) hidden.push(ref);
          listener?.();
        }, (fn) => { listener = fn; return () => { listener = null; }; },
        frame, (id) => frames.delete(id), () => hostId, route);
      return { cleanup, writes, publish: () => listener?.() };
    }
    async function settle() {
      for (let i = 0; i < 4; i++) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach((fn) => fn());
      }
    }
    function view() {
      return Object.fromEntries([...list.children].map((row) => [row.getAttribute("data-model-id"),
        row.querySelector('[role="switch"]')?.getAttribute("aria-checked")]));
    }
    const remote = install("remote", []);
    const local = install("local", ["grok-4.6", "composer-2.5"]);
    await settle(); const initial = view();
    const firstButton = list.children[0].querySelector('[role="switch"]');
    const legacy = firstButton.cloneNode(true); legacy.removeAttribute("data-mono-model-owner");
    legacy.addEventListener("click", () => remote.writes.push({ legacy: true }));
    firstButton.replaceWith(legacy); await settle();
    for (const button of list.querySelectorAll('[role="switch"]')) button.setAttribute("aria-checked", "true");
    await Promise.resolve(); await Promise.resolve(); const afterLegacy = view();
    list.children[1].querySelector('[role="switch"]').click(); await settle(); const clicked = view();
    list.prepend(list.lastElementChild); const newRow = add("glm-5p3-flash"); await settle();
    newRow.querySelector('[role="switch"]').click(); await settle(); const refreshed = view();
    remote.publish(); await settle(); const stable = view();
    // The replaced legacy button must now use the local callback.
    list.querySelector('[data-model-id="auto-smart"] [role="switch"]').click(); await settle();
    local.cleanup(); remote.cleanup(); await settle();
    return { initial, afterLegacy, clicked, refreshed, stable, localWrites: local.writes,
      remoteWrites: remote.writes.length,
      clean: !document.querySelector('[data-mono-model-toggle], [data-mono-owned]') };
  }, source);
  const expected = { "auto-smart": "true", "grok-4.7": "true", "grok-4.6": "false", "composer-2.5": "false" };
  assert.deepEqual(switches.initial, expected, "only the routed host may display model settings");
  assert.deepEqual(switches.afterLegacy, expected, "legacy writes must be corrected before paint");
  assert.deepEqual(switches.clicked, { ...expected, "grok-4.7": "false" });
  assert.equal(switches.refreshed["glm-5p3-flash"], "false");
  assert.deepEqual(switches.stable, switches.refreshed, "another host must not flip any switch");
  assert.equal(switches.remoteWrites, 0, "clicks must only persist on the routed host");
  assert.deepEqual(switches.localWrites, [
    { provider: "cursor", modelId: "grok-4.7", visible: false },
    { provider: "cursor", modelId: "glm-5p3-flash", visible: false },
    { provider: "cursor", modelId: "auto-smart", visible: false },
  ]);
  assert.equal(switches.clean, true);
  console.log("PASS model switches: host ownership, legacy takeover, independent clicks, refreshed list, cleanup");
  await task.finish({ keep: [] });
}
const space = process.env.MONO_BROWSER_SPACE ? Number(process.env.MONO_BROWSER_SPACE) : "Mono model picker regression";
const result = spawnSync("ego-browser", ["nodejs"], {
  input: `(${runBrowser.toString()})(${JSON.stringify(source)}, ${JSON.stringify(space)});`,
  encoding: "utf8",
});
process.stdout.write(result.stdout ?? "");
process.stderr.write(result.stderr ?? "");
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
