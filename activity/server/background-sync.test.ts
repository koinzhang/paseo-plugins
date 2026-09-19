import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PluginHandlerContext } from "@getpaseo/plugin/server";
import { createBackgroundSync } from "./background-sync.ts";
import { createUsageStore } from "./store.ts";

type PaseoApi = PluginHandlerContext["paseo"];

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "silent-history-"));
  const store = createUsageStore({ dir, driver: "sqlite" });
  const path = join(dir, "checkpoints.json");
  const agent = { id: "a1", provider: "codex", createdAt: "2026-09-19", updatedAt: "2026-09-19", lastUserMessageAt: null };
  const paseo = { agents: { list: async () => ({ entries: [{ agent }] }) } } as unknown as PaseoApi;
  return { store, path, agent, paseo, cleanup() { store.close(); rmSync(dir, { recursive: true, force: true }); } };
}

test("successful history checks persist, skip unchanged agents, and rescan changes or new versions", async () => {
  const f = fixture();
  let scans = 0;
  const scan = async () => { scans++; return { syncedAgents: 1, inserted: 0, errors: [] }; };
  const run = async (version = 1) => {
    const sync = createBackgroundSync(f.store, { path: f.path, scan, version });
    try { await sync.request(f.paseo); } finally { sync.stop(); }
  };
  try {
    await run(); await run();
    assert.equal(scans, 1);
    f.agent.updatedAt = "2026-09-20";
    await run(); assert.equal(scans, 2);
    await run(2); assert.equal(scans, 3);
  } finally { f.cleanup(); }
});

test("failed scans are not checkpointed and retry on the next check", async () => {
  const f = fixture();
  let attempts = 0;
  const scan = async () => {
    attempts++;
    return { syncedAgents: 0, inserted: 0, errors: [{ agentId: "a1", message: "temporary failure" }] };
  };
  try {
    for (let i = 0; i < 2; i++) {
      const sync = createBackgroundSync(f.store, { path: f.path, scan });
      await sync.request(f.paseo); sync.stop();
    }
    assert.equal(attempts, 2);
    assert.equal(existsSync(f.path), false);
  } finally { f.cleanup(); }
});

test("concurrent triggers share one scan; stopping prevents completion checkpoints", async () => {
  const f = fixture();
  let scans = 0;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const scan = async () => { scans++; await gate; return { syncedAgents: 1, inserted: 0, errors: [] }; };
  const sync = createBackgroundSync(f.store, { path: f.path, scan });
  try {
    const first = sync.request(f.paseo);
    assert.equal(sync.request(f.paseo), first);
    await Promise.resolve();
    assert.equal(scans, 1);
    sync.stop(); release(); await first;
    assert.equal(existsSync(f.path), false);
    await sync.request(f.paseo);
    assert.equal(scans, 1);
  } finally { sync.stop(); f.cleanup(); }
});

test("background check upserts listed and tool-call-only agents before scanning", async () => {
  const f = fixture();
  let scans = 0;
  const scan = async () => {
    scans++;
    return { syncedAgents: 1, inserted: 0, errors: [] };
  };
  f.store.upsertMany([{
    agentId: "orphan",
    callId: "c1",
    workspaceId: null,
    provider: "claude",
    turnId: null,
    name: "Bash",
    detailType: "shell",
    category: "regular",
    confidence: null,
    skillName: null,
    mcpServer: null,
    mcpTool: null,
    command: "ls",
    filePath: null,
    status: "completed",
    errorMessage: null,
    seq: null,
    ts: "2026-09-18T12:00:00.000Z",
    ingestedAt: "2026-09-18T12:00:00.000Z",
  }]);
  const sync = createBackgroundSync(f.store, { path: f.path, scan });
  try {
    await sync.request(f.paseo);
    assert.equal(scans, 1);
    assert.ok(f.store.getAgent("a1"));
    assert.ok(f.store.getAgent("orphan"));
  } finally {
    sync.stop();
    f.cleanup();
  }
});

test("stopping after agents.list prevents directory writes", async () => {
  const f = fixture();
  let releaseList!: () => void;
  const listGate = new Promise<void>((resolve) => {
    releaseList = resolve;
  });
  const paseo = {
    agents: {
      list: async () => {
        await listGate;
        return { entries: [{ agent: f.agent }] };
      },
    },
  } as unknown as PaseoApi;
  const sync = createBackgroundSync(f.store, {
    path: f.path,
    scan: async () => ({ syncedAgents: 1, inserted: 0, errors: [] }),
  });
  try {
    const pending = sync.request(paseo);
    await Promise.resolve();
    sync.stop();
    releaseList();
    await pending;
    assert.equal(f.store.selectAgents().length, 0);
  } finally {
    sync.stop();
    f.cleanup();
  }
});
