import assert from "node:assert/strict";
import { test } from "node:test";
import { loadWorkspaceAgentStatuses } from "./list-host-agents.ts";

test("workspace status uses actual project key on every page and rejects other workspaces", async () => {
  let pages = 0;
  const map = await loadWorkspaceAgentStatuses({ agents: { list: async (options) => {
    assert.deepEqual(options.filter, { includeArchived: true, projectKeys: ["git:actual-key"] });
    pages++;
    return {
      entries: [{ agent: { id: `a${pages}`, workspaceId: pages === 1 ? "other" : "w", pendingPermissions: [{}] } },
        { agent: { id: "unknown" } }],
      pageInfo: { hasMore: pages === 1, nextCursor: pages === 1 ? "next" : null },
    };
  } } }, "w", "git:actual-key");
  assert.equal(pages, 2);
  assert.deepEqual(Object.keys(map), ["a2"]);
  assert.equal(map.a2?.permissionCount, 1);
});
