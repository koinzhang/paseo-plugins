import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { handleCachedScan, handlePreview, scanProvider } from "./handlers.ts";
import { readSnapshot, SCAN_REFRESH_MS, snapshotFile, writeSnapshot } from "./scan-snapshot.ts";

test("saved scans survive a new read, expire after ten minutes, and reject corrupt snapshots", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "customize-snapshot-"));
  const scannedAt = "2026-01-01T00:00:00.000Z";
  const result = { provider: "codex" as const, projectRoot: "/project", home: homedir(), entries: [], scannedAt };
  const time = Date.parse(scannedAt);
  try {
    writeSnapshot(result, directory);
    assert.equal(statSync(directory).mode & 0o777, 0o700);
    assert.deepEqual(readSnapshot("codex", "/project", { directory, now: time + SCAN_REFRESH_MS - 1 }), { snapshot: result, stale: false });
    assert.deepEqual(readSnapshot("codex", "/project", { directory, now: time + SCAN_REFRESH_MS }), { snapshot: result, stale: true });
    assert.equal(readSnapshot("codex", "/other", { directory }).snapshot, null);
    const file = snapshotFile("codex", "/project", directory);
    assert.equal(statSync(file).mode & 0o777, 0o600);
    assert.equal(JSON.parse(readFileSync(file, "utf8")).version, 1);
    writeFileSync(file, JSON.stringify({ version: 2, result }));
    assert.equal(readSnapshot("codex", "/project", { directory }).snapshot, null);
    writeFileSync(file, "broken json");
    assert.equal(readSnapshot("codex", "/project", { directory }).snapshot, null);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("a persisted path must appear in a fresh provider scan before preview", async () => {
  const paseoHome = mkdtempSync(path.join(tmpdir(), "customize-home-"));
  const project = mkdtempSync(path.join(tmpdir(), "customize-project-"));
  const originalHome = process.env.PASEO_HOME;
  try {
    process.env.PASEO_HOME = paseoHome;
    writeFileSync(path.join(project, "AGENTS.md"), "current instructions");
    const entries = scanProvider("codex", project, { home: homedir(), env: process.env, platform: process.platform });
    const valid = entries.find((entry) => entry.path === path.join(project, "AGENTS.md"));
    assert.ok(valid);
    const stale = { ...valid, id: "stale", path: path.join(project, "missing.md") };
    mkdirSync(path.join(paseoHome, "plugin-data"), { recursive: true });
    writeSnapshot({ provider: "codex", projectRoot: project, home: homedir(), entries: [valid, stale], scannedAt: new Date().toISOString() });
    const cached = handleCachedScan({ provider: "codex", projectRoot: project });
    assert.equal(cached.snapshot?.entries.length, 2);
    await assert.rejects(handlePreview({ path: stale.path }), /Path is not part of a Customize scan/);
    const preview = await handlePreview({ path: valid.path });
    assert.match(preview.content, /current instructions/);
  } finally {
    if (originalHome === undefined) delete process.env.PASEO_HOME;
    else process.env.PASEO_HOME = originalHome;
    rmSync(paseoHome, { recursive: true, force: true });
    rmSync(project, { recursive: true, force: true });
  }
});
