import assert from "node:assert/strict";
import { test } from "node:test";
import { agentStatusInfo, applyAgentStatusUpdate } from "./list-host-agents.ts";

test("agentStatusInfo maps parentAgentId and preserves it on partial pushes", () => {
  const first = agentStatusInfo({ id: "child", workspaceId: "w", parentAgentId: "parent" });
  assert.equal(first.parentAgentId, "parent");
  const partial = agentStatusInfo(
    { id: "child", workspaceId: "w", status: "running", pendingPermissions: [{}] },
    first,
  );
  assert.equal(partial.parentAgentId, "parent");
  assert.equal(partial.status, "running");
  assert.equal(partial.permissionCount, 1);
  const cleared = agentStatusInfo(
    { id: "child", workspaceId: "w", parentAgentId: null },
    partial,
  );
  assert.equal(cleared.parentAgentId, null);
});

test("agentStatusInfo falls back to paseo.parent-agent-id label when field is null", () => {
  const fromLabel = agentStatusInfo({
    id: "child",
    workspaceId: "w",
    parentAgentId: null,
    labels: { "paseo.parent-agent-id": "e59c28e7-91f6-4571-b182-56c9b93116c6" },
  });
  assert.equal(fromLabel.parentAgentId, "e59c28e7-91f6-4571-b182-56c9b93116c6");
  const prefersField = agentStatusInfo({
    id: "child",
    workspaceId: "w",
    parentAgentId: "root",
    labels: { "paseo.parent-agent-id": "other" },
  });
  assert.equal(prefersField.parentAgentId, "root");
});

test("remove only removes membership; closed is accepted only from explicit status", () => {
  const map: Record<string, ReturnType<typeof agentStatusInfo>> = {
    a: agentStatusInfo({ id: "a", workspaceId: "w", status: "running" }),
  };
  applyAgentStatusUpdate(map, "w", { kind: "remove", agentId: "a" });
  assert.equal(Boolean(map.a), false);
  applyAgentStatusUpdate(map, "w", { kind: "upsert", agent: { id: "a", workspaceId: "w", status: "closed", archivedAt: null } });
  assert.equal(map.a?.status, "closed");
  assert.equal(map.a?.archivedAt, null);
  // A new authoritative snapshot can reopen without a timestamp heuristic.
  applyAgentStatusUpdate(map, "w", { kind: "upsert", agent: { id: "a", workspaceId: "w", status: "idle", archivedAt: null } });
  assert.equal(map.a?.status, "idle");
});
