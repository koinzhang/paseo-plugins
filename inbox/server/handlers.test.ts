import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { PaseoApi } from "@getpaseo/client";
import type { DaemonClient } from "@getpaseo/client/internal/daemon-client";
import type { PluginRpcContract, RpcOutput } from "@getpaseo/plugin";
import type { PluginServerContext } from "@getpaseo/plugin/server";
import type { InboxChange } from "../shared/changes.ts";
import {
  agentStates, deleteItem, listItems, saveNote, starAgent, tagItem, unarchiveAgent, updateItem,
} from "../shared/contracts.ts";
import { InboxChanges } from "./changes.ts";
import { registerHandlers } from "./handlers.ts";
import { InboxStore } from "./store.ts";

type Handler = (input: unknown, context: { paseo: PaseoApi }) => unknown;

function harness(failRefresh = false) {
  const directory = mkdtempSync(join(tmpdir(), "inbox-handlers-"));
  const changes = new InboxChanges();
  const store = new InboxStore({ dir: directory, onChange: () => changes.invalidate() });
  const handlers = new Map<string, Handler>();
  const server = {
    handle(contract: { name: string }, handler: Handler) { handlers.set(contract.name, handler); },
  } as unknown as PluginServerContext;
  const project = { key: "remote:github.com/test/repo", label: "repo" };
  let closed = false;
  const calls: string[] = [];
  let title = "original agent";
  const agent = () => ({
    id: "agent", title, provider: "codex", model: null, workspaceId: "workspace", cwd: "/repo",
    createdAt: "2026-11-25T00:00:00Z", status: "idle", archivedAt: null,
  });
  const paseo = {
    workspaces: { list: async () => ({
      entries: [{ id: "workspace", name: "main", projectId: "project", projectRootPath: "/repo", projectDisplayName: "repo" }],
      pageInfo: { hasMore: false },
    }) },
    projects: { list: async () => ({ projects: [] }) },
    agents: { ref: () => ({ refresh: async () => ({ agent: agent() }) }) },
  } as unknown as PaseoApi;
  const client = {
    fetchAgent: async () => { calls.push("fetch"); return { agent: agent() }; },
    getLastServerInfoMessage: () => ({ features: { workspaceRecovery: true } }),
    inspectWorkspaceRecovery: async () => { calls.push("inspect"); return { kind: "recoverable" }; },
    restoreWorkspace: async () => { calls.push("restore workspace"); },
    refreshAgent: async () => { calls.push("refresh agent"); if (failRefresh) throw new Error("provider failed"); },
  } as unknown as DaemonClient;
  registerHandlers(server, {
    store, changes, resolveProject: async () => project,
    daemon: { get: async () => client, close: async () => {} },
  });
  return {
    changes, store, project, calls,
    rename: () => { title = "renamed agent"; },
    async call<Contract extends PluginRpcContract>(contract: Contract, input: unknown): Promise<RpcOutput<Contract>> {
      const handler = handlers.get(contract.name);
      assert.ok(handler);
      return await handler(contract.input.parse(input), { paseo }) as RpcOutput<Contract>;
    },
    close() {
      if (closed) return;
      closed = true;
      changes.close();
      store.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

test("SQLite-backed RPC writes invalidate both clients without sending note contents", async () => {
  const current = harness();
  const first = new AbortController();
  const firstEvents: InboxChange[] = [];
  const secondEvents: InboxChange[] = [];
  const firstDone = current.changes.subscribe({ signal: first.signal, push: async (event) => { firstEvents.push(event); } });
  const secondDone = current.changes.subscribe({ signal: new AbortController().signal, push: async (event) => { secondEvents.push(event); } });
  try {
    await settle();
    const { item } = await current.call(saveNote, { kind: "scratch", body: "private note" });
    await current.call(saveNote, { id: item.id, kind: "scratch", body: "edited private note" });
    await current.call(tagItem, { id: item.id, projectKey: null, workspaceId: "workspace" });
    await current.call(updateItem, { id: item.id, kind: "note", pinned: true });
    await current.call(starAgent, { agentId: "agent" });
    await settle();
    assert.equal(firstEvents.length, 6);
    assert.deepEqual(secondEvents, firstEvents);
    assert.ok(firstEvents.every((event) => JSON.stringify(event) === '{"type":"invalidate"}'));
    assert.equal(current.store.get(item.id)?.body, "edited private note");
    const count = firstEvents.length;
    await current.call(starAgent, { agentId: "agent" });
    await assert.rejects(current.call(saveNote, { kind: "note", body: "" }));
    await settle();
    assert.equal(firstEvents.length, count);
    current.rename();
    await current.call(agentStates, { agentIds: ["agent"] });
    await current.call(deleteItem, { id: item.id });
    await settle();
    assert.equal(firstEvents.length, count + 2);
    first.abort();
    await firstDone;
    await current.call(saveNote, { kind: "note", body: "written while disconnected" });
    await settle();
    assert.equal(firstEvents.length, count + 2);
    const reconnected: InboxChange[] = [];
    const reconnectedDone = current.changes.subscribe({ signal: new AbortController().signal, push: async (event) => { reconnected.push(event); } });
    const fresh = await current.call(listItems, {});
    assert.ok(fresh.items.some((entry) => entry.body === "written while disconnected"));
    assert.deepEqual(reconnected, [{ type: "invalidate" }]);
    current.close();
    await Promise.all([secondDone, reconnectedDone]);
  } catch (error) {
    current.close();
    throw error;
  }
});

test("recovery restores the workspace before the agent, then invalidates", async () => {
  const current = harness();
  let invalidations = 0;
  const done = current.changes.subscribe({ signal: new AbortController().signal, push: async () => { invalidations += 1; } });
  try {
    await settle();
    assert.deepEqual(await current.call(unarchiveAgent, { agentId: "agent" }), { restoredWorkspace: true });
    await settle();
    assert.deepEqual(current.calls, ["fetch", "inspect", "restore workspace", "refresh agent"]);
    assert.equal(invalidations, 2);
  } finally {
    current.close();
    await done;
  }
});

test("a failure after workspace recovery still invalidates partial state", async () => {
  const current = harness(true);
  let invalidations = 0;
  const done = current.changes.subscribe({ signal: new AbortController().signal, push: async () => { invalidations += 1; } });
  try {
    await settle();
    await assert.rejects(current.call(unarchiveAgent, { agentId: "agent" }), /provider failed/);
    await settle();
    assert.deepEqual(current.calls, ["fetch", "inspect", "restore workspace", "refresh agent"]);
    assert.equal(invalidations, 2);
  } finally {
    current.close();
    await done;
  }
});
