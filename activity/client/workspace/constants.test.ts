import assert from "node:assert/strict";
import { test } from "node:test";
import { countDirectSubAgents, countSubAgentsByParent, type AgentStatusInfo } from "./constants.ts";

function info(partial: Partial<AgentStatusInfo> = {}): AgentStatusInfo {
  return {
    rank: 4,
    updatedAt: null,
    status: "idle",
    permissionCount: 0,
    requiresAttention: false,
    attentionReason: null,
    parentAgentId: null,
    ...partial,
  };
}

test("countDirectSubAgents counts only direct children", () => {
  const byId = {
    parent: info(),
    a: info({ parentAgentId: "parent" }),
    b: info({ parentAgentId: "parent" }),
    grand: info({ parentAgentId: "a" }),
    other: info({ parentAgentId: "someone-else" }),
  };
  assert.equal(countDirectSubAgents("parent", byId), 2);
  assert.equal(countDirectSubAgents("a", byId), 1);
  assert.equal(countDirectSubAgents("missing", byId), 0);
  assert.equal(countDirectSubAgents("parent", undefined), 0);
});

test("countSubAgentsByParent aggregates registry parent ids", () => {
  const counts = countSubAgentsByParent([
    { parentAgentId: null },
    { parentAgentId: "parent" },
    { parentAgentId: " parent " },
    { parentAgentId: "other" },
    { parentAgentId: "" },
  ]);
  assert.deepEqual(counts, { parent: 2, other: 1 });
});
