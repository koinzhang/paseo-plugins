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
      "cancelAnimationFrame", `${source}\nreturn installModelVisibilityWeb();`,
    );
    function install(ids) {
      let hidden = ids.map((modelId) => ({ provider: "codex", modelId }));
      let listener;
      const cleanup = create(
        { OS: "web" }, () => hidden, () => undefined, () => null, () => {}, () => {},
        (fn) => { listener = fn; return () => { listener = null; }; }, queue, frame, cancelFrame,
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
