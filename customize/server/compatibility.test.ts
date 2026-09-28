import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { mechanismFor } from "../shared/mechanisms.ts";
import { cursorThirdPartySwitch, opencodeExternalSkillSwitch } from "./compatibility.ts";
import { handleCachedScan, scanProvider } from "./handlers.ts";
import { writeSnapshot } from "./scan-snapshot.ts";

function skill(root: string, name: string): string {
  const directory = path.join(root, name);
  mkdirSync(directory, { recursive: true });
  const file = path.join(directory, "SKILL.md");
  writeFileSync(file, `---\nname: ${name}\ndescription: ${name} skill\n---\n`);
  return file;
}

test("physical skill aliases use native, then .agents, while distinct same-name files remain", () => {
  const home = mkdtempSync(path.join(tmpdir(), "customize-alias-"));
  const project = path.join(home, "project");
  try {
    const agents = path.join(project, ".agents", "skills");
    const native = path.join(project, ".cursor", "skills");
    const claude = path.join(project, ".claude", "skills");
    const entity = skill(agents, "shared");
    mkdirSync(path.dirname(native), { recursive: true });
    mkdirSync(path.dirname(claude), { recursive: true });
    symlinkSync(agents, native);
    symlinkSync(agents, claude);
    const distinct = skill(path.join(home, ".agents", "skills"), "shared");
    const scan = () => scanProvider("cursor", project, { home, env: {}, platform: "darwin" }).filter((entry) => entry.category === "skills");
    assert.deepEqual(scan().map((entry) => entry.path).sort(), [path.join(native, "shared", "SKILL.md"), distinct].sort());
    rmSync(native);
    assert.deepEqual(scan().map((entry) => entry.path).sort(), [entity, distinct].sort());
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("Cursor's persisted third-party switch gates external skills and updates the explanation", () => {
  const home = mkdtempSync(path.join(tmpdir(), "customize-cursor-switch-"));
  const project = path.join(home, "project");
  const dbFile = path.join(home, "Library/Application Support/Cursor/User/globalStorage/state.vscdb");
  try {
    skill(path.join(project, ".cursor", "skills"), "native");
    skill(path.join(project, ".claude", "skills"), "external");
    assert.deepEqual(cursorThirdPartySwitch({ home, platform: "darwin" }), { enabled: true, source: "default" });
    mkdirSync(path.dirname(dbFile), { recursive: true });
    const db = new DatabaseSync(dbFile);
    db.exec("CREATE TABLE ItemTable (key TEXT PRIMARY KEY, value TEXT)");
    db.prepare("INSERT INTO ItemTable VALUES (?, ?)").run("cursor/thirdPartyExtensibilityEnabled", "false");
    db.close();
    const state = cursorThirdPartySwitch({ home, platform: "darwin" });
    assert.deepEqual(state, { enabled: false, source: "cursorSettings" });
    const entries = scanProvider("cursor", project, { home, env: {}, platform: "darwin" });
    assert.equal(entries.find((entry) => entry.name === "native")?.status, "auto");
    assert.equal(entries.find((entry) => entry.name === "external")?.status, "disabled");
    const mechanism = mechanismFor("cursor", "skills", state);
    assert.match(mechanism.notes[0]!.en, /off/);
    assert.equal(mechanism.locations.some((location) => location.path.includes(".claude")), false);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("OpenCode external skill discovery defaults on and can be disabled by environment", () => {
  const home = mkdtempSync(path.join(tmpdir(), "customize-opencode-switch-"));
  const project = path.join(home, "project");
  try {
    skill(path.join(project, ".opencode", "skills"), "native");
    skill(path.join(project, ".agents", "skills"), "shared");
    assert.deepEqual(opencodeExternalSkillSwitch({}), { enabled: true });
    const env = { OPENCODE_DISABLE_EXTERNAL_SKILLS: "1" };
    const entries = scanProvider("opencode", project, { home, env, platform: "linux" });
    assert.equal(entries.find((entry) => entry.name === "native")?.status, "auto");
    assert.equal(entries.find((entry) => entry.name === "shared")?.status, "disabled");
    const mechanism = mechanismFor("opencode", "skills", { enabled: false, source: "OPENCODE_DISABLE_EXTERNAL_SKILLS" });
    assert.equal(mechanism.locations.some((location) => location.path.includes(".agents")), false);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("a changed compatibility switch makes an otherwise fresh snapshot stale", () => {
  const paseoHome = mkdtempSync(path.join(tmpdir(), "customize-switch-cache-"));
  const originalHome = process.env.PASEO_HOME;
  const originalFlag = process.env.OPENCODE_DISABLE_EXTERNAL_SKILLS;
  try {
    process.env.PASEO_HOME = paseoHome;
    delete process.env.OPENCODE_DISABLE_EXTERNAL_SKILLS;
    writeSnapshot({ provider: "opencode", projectRoot: null, home: homedir(), entries: [], compatibility: { enabled: true, source: "default" }, scannedAt: new Date().toISOString() });
    assert.equal(handleCachedScan({ provider: "opencode", projectRoot: null }).stale, false);
    process.env.OPENCODE_DISABLE_EXTERNAL_SKILLS = "1";
    assert.equal(handleCachedScan({ provider: "opencode", projectRoot: null }).stale, true);
  } finally {
    if (originalHome === undefined) delete process.env.PASEO_HOME;
    else process.env.PASEO_HOME = originalHome;
    if (originalFlag === undefined) delete process.env.OPENCODE_DISABLE_EXTERNAL_SKILLS;
    else process.env.OPENCODE_DISABLE_EXTERNAL_SKILLS = originalFlag;
    rmSync(paseoHome, { recursive: true, force: true });
  }
});

test("OpenCode's mechanism preserves version-dependent behavior without repeating the toolbar version", () => {
  const state = { enabled: true, source: "default" };
  const v2 = mechanismFor("opencode", "skills", state, { version: "2.0.18", source: "host" });
  assert.equal(v2.notes.some((note) => note.en.includes("2.0.18") || note.en.includes("host diagnostic")), false);
  assert.ok(v2.notes.some((note) => note.zh.includes("仍可按 ID 显式加载")));
  const v1 = mechanismFor("opencode", "skills", state, { version: "1.18.32", source: "cli" });
  assert.equal(v1.notes.some((note) => note.en.includes("CLI fallback") || note.en.includes("1.18.32")), false);
  assert.ok(v1.notes.some((note) => note.en.includes("v1 advertises")));
  assert.equal(v1.notes.some((note) => note.en.includes("can still be loaded explicitly")), false);
  const unknown = mechanismFor("opencode", "skills", state, { version: null, source: "unknown" });
  assert.ok(unknown.notes.some((note) => note.en.includes("await version confirmation")));
});
