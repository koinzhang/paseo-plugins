import assert from "node:assert/strict";
import { test } from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { updateWorkspaceStatusCache } from "./status-cache.ts";
import { agentStatusInfo, loadWorkspaceAgentStatuses, type HostAgentUpdate } from "./list-host-agents.ts";
import { agentUpdatedAt } from "./constants.ts";
import type { AgentUsageItem } from "../../shared/usage.ts";

test("late poll cannot erase live permission or remove; cancellation preserves earlier pushes", async () => {
  const client = new QueryClient();
  const key = ["activity", "workspace-agent-status", "w"];
  const stale = { a: agentStatusInfo({ id: "a", workspaceId: "w" }), b: agentStatusInfo({ id: "b", workspaceId: "w" }) };
  client.setQueryData(key, stale);
  let finish!: (value: typeof stale) => void;
  const pending = client.fetchQuery({ queryKey: key, queryFn: () => new Promise<typeof stale>(resolve => { finish = resolve; }) });
  updateWorkspaceStatusCache(client, key, "w", { kind: "upsert", agent: { id: "a", workspaceId: "w", pendingPermissions: [{}] } });
  updateWorkspaceStatusCache(client, key, "w", { kind: "remove", agentId: "b" });
  finish(stale);
  await pending;
  await Promise.resolve();
  const current = client.getQueryData<typeof stale>(key)!;
  assert.equal(current.a.permissionCount, 1);
  assert.equal(current.b, undefined);
  assert.equal(client.getQueryState(key)?.status, "success");
  assert.equal(client.getQueryState(key)?.fetchStatus, "idle");
  client.clear();
});

test("first paginated load replays upserts and removes and releases its listener", async () => {
  let listener!: (update: HostAgentUpdate) => void;
  let unsubscribed = false;
  let pages = 0;
  const map = await loadWorkspaceAgentStatuses({ agents: {
    subscribe: (handler) => { listener = handler; return () => { unsubscribed = true; }; },
    list: async () => {
      pages++;
      if (pages === 1) return { entries: [{ agent: { id: "a", workspaceId: "w" } }], pageInfo: { hasMore: true, nextCursor: "next" } };
      listener({ kind: "upsert", agent: { id: "a", workspaceId: "w", pendingPermissions: [{}] } });
      listener({ kind: "remove", agentId: "b" });
      return { entries: [{ agent: { id: "b", workspaceId: "w" } }], pageInfo: { hasMore: false, nextCursor: null } };
    },
  } }, "w");
  assert.equal(map.a?.permissionCount, 1);
  assert.equal(map.b, undefined);
  assert.equal(unsubscribed, true);
});

test("failed load releases its listener", async () => {
  let unsubscribed = false;
  await assert.rejects(loadWorkspaceAgentStatuses({ agents: {
    subscribe: () => () => { unsubscribed = true; },
    list: async () => { throw new Error("offline"); },
  } }, "w"), /offline/);
  assert.equal(unsubscribed, true);
});

test("live updatedAt takes precedence over old database sync timestamps", () => {
  const item = { agentId: "a", updatedAt: "2026-09-19T12:00:00Z", lastActivityAt: "2026-01-01T00:00:00Z" } as AgentUsageItem;
  const live = { a: agentStatusInfo({ id: "a", updatedAt: "2026-01-02T00:00:00Z" }) };
  assert.equal(agentUpdatedAt(item, live), "2026-01-02T00:00:00Z");
  assert.equal(agentUpdatedAt(item, undefined), item.updatedAt);
});
