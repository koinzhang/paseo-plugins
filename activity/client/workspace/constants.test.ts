import assert from "node:assert/strict";
import { test } from "node:test";
import {
  countDirectSubAgents,
  countSubAgentsByParent,
  type AgentStatusFilter,
  type AgentStatusInfo,
} from "./constants.ts";

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

function filters(...ids: AgentStatusFilter[]): ReadonlySet<AgentStatusFilter> {
  return new Set(ids);
}

const children = [
  { parentAgentId: null },
  { parentAgentId: "parent" },
  { parentAgentId: " parent " },
  { parentAgentId: "other" },
  { parentAgentId: "" },
  { parentAgentId: "parent", archivedAt: "2026-09-20T00:00:00.000Z" },
  { parentAgentId: "gone", archivedAt: "2026-09-20T00:00:00.000Z" },
];

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

test("countSubAgentsByParent follows Status Active / Archived filters", () => {
  assert.deepEqual(countSubAgentsByParent(children, filters("active")), {
    parent: 2,
    other: 1,
  });
  assert.deepEqual(countSubAgentsByParent(children, filters("archived")), {
    parent: 1,
    gone: 1,
  });
  assert.deepEqual(countSubAgentsByParent(children, filters("active", "archived")), {
    parent: 3,
    other: 1,
    gone: 1,
  });
  assert.deepEqual(countSubAgentsByParent(children, filters()), {});
});
