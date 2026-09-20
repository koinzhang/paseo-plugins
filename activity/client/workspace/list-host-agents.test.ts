import assert from "node:assert/strict";
import { test } from "node:test";
import { attentionKind } from "./constants.ts";
import { agentStatusInfo, loadWorkspaceAgentStatuses } from "./list-host-agents.ts";

test("workspace status uses daemon placement project ID on every page and rejects other workspaces", async () => {
  let pages = 0;
  const map = await loadWorkspaceAgentStatuses({ agents: { list: async (options) => {
    assert.deepEqual(options.filter, { includeArchived: true, projectKeys: ["prj_c187d0857b6da810"] });
    pages++;
    return {
      entries: [{ agent: { id: `a${pages}`, workspaceId: pages === 1 ? "other" : "w", pendingPermissions: [{}] } },
        { agent: { id: "unknown" } }],
      pageInfo: { hasMore: pages === 1, nextCursor: pages === 1 ? "next" : null },
    };
  } } }, "w", "prj_c187d0857b6da810");
  assert.equal(pages, 2);
  assert.deepEqual(Object.keys(map), ["a2"]);
  assert.equal(map.a2?.permissionCount, 1);
});

// Reproduce daemon 0.8's structural filter, including the two different keys.
test("pending questions survive a poll when catalog key differs from placement key", async () => {
  const workspace = { id: "w", projectId: "prj_project" };
  const project = { projectId: workspace.projectId, projectKey: "remote:github.com/org/repo" };
  const entry = {
    agent: { id: "waiting", workspaceId: workspace.id, status: "running",
      requiresAttention: false, attentionReason: null, pendingPermissions: [{ tool: "question" }] },
    project: { projectKey: project.projectId },
  };
  const paseo = { agents: { list: async (options: { filter?: { projectKeys?: string[] } }) => ({
    entries: !options.filter?.projectKeys || options.filter.projectKeys.includes(entry.project.projectKey) ? [entry] : [],
    pageInfo: { hasMore: false, nextCursor: null },
  }) } };
  const incorrect = await loadWorkspaceAgentStatuses(paseo, workspace.id, project.projectKey);
  assert.deepEqual(incorrect, {});
  for (let poll = 0; poll < 2; poll++) {
    const statuses = await loadWorkspaceAgentStatuses(paseo, workspace.id, workspace.projectId);
    assert.equal(statuses.waiting?.permissionCount, 1);
    assert.equal(statuses.waiting?.rank, 0);
    assert.equal(attentionKind(statuses.waiting), "permission");
  }
  const fallback = await loadWorkspaceAgentStatuses(paseo, workspace.id);
  assert.equal(fallback.waiting?.permissionCount, 1);
});

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
