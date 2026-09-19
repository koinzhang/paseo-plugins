import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { resolveActivityDataDir } from "./migrate-data.ts";
import { LEGACY_PLUGIN_ID, PLUGIN_ID } from "../shared/plugin-id.ts";

const dirs: string[] = [];

function tempHome(): string {
  const home = mkdtempSync(join(tmpdir(), "activity-migrate-"));
  dirs.push(home);
  return home;
}

after(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

test("migrate renames legacy tool-usage dir into activity", () => {
  const home = tempHome();
  const legacy = join(home, ".paseo", "plugin-data", LEGACY_PLUGIN_ID);
  mkdirSync(legacy, { recursive: true });
  writeFileSync(join(legacy, "usage.db"), "sqlite");
  writeFileSync(join(legacy, "history-checkpoints.json"), "{}");

  const logs: string[] = [];
  const result = resolveActivityDataDir({
    homeDir: home,
    log: (message) => logs.push(message),
  });

  assert.equal(result.migrated, true);
  assert.equal(result.dir, join(home, ".paseo", "plugin-data", PLUGIN_ID));
  assert.deepEqual(readdirSync(result.dir).sort(), [
    "history-checkpoints.json",
    "usage.db",
  ]);
  assert.equal(readdirSync(join(home, ".paseo", "plugin-data")).includes(LEGACY_PLUGIN_ID), false);
  assert.ok(logs.some((line) => line.includes("migrated")));
});

test("migrate is a no-op when activity already has data", () => {
  const home = tempHome();
  const legacy = join(home, ".paseo", "plugin-data", LEGACY_PLUGIN_ID);
  const next = join(home, ".paseo", "plugin-data", PLUGIN_ID);
  mkdirSync(legacy, { recursive: true });
  mkdirSync(next, { recursive: true });
  writeFileSync(join(legacy, "usage.db"), "old");
  writeFileSync(join(next, "usage.db"), "new");

  const result = resolveActivityDataDir({ homeDir: home, log: () => {} });
  assert.equal(result.migrated, false);
  assert.equal(readdirSync(legacy).includes("usage.db"), true);
  assert.equal(readdirSync(next).includes("usage.db"), true);
});

test("fresh install creates empty activity dir", () => {
  const home = tempHome();
  const result = resolveActivityDataDir({ homeDir: home, log: () => {} });
  assert.equal(result.migrated, false);
  assert.equal(result.dir, join(home, ".paseo", "plugin-data", PLUGIN_ID));
  assert.deepEqual(readdirSync(result.dir), []);
});
