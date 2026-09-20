import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  attentionPillIconName,
  attentionPillTint,
  filterAttentionAgents,
} from "./attention-agents.ts";
import type { AgentStatusInfo } from "./workspace/constants.ts";

function status(partial: Partial<AgentStatusInfo>): AgentStatusInfo {
  return {
    rank: 0,
    updatedAt: null,
    status: null,
    permissionCount: 0,
    requiresAttention: false,
    attentionReason: null,
    parentAgentId: null,
    ...partial,
  };
}

describe("filterAttentionAgents", () => {
  it("keeps finished, permission, and error; drops current and idle", () => {
    const statuses = {
      self: status({ requiresAttention: true, attentionReason: "finished" }),
      done: status({
        requiresAttention: true,
        attentionReason: "finished",
        updatedAt: "2026-09-20T10:00:00Z",
      }),
      wait: status({
        permissionCount: 1,
        updatedAt: "2026-09-20T09:00:00Z",
      }),
      fail: status({
        status: "error",
        requiresAttention: true,
        attentionReason: "error",
        updatedAt: "2026-09-20T08:00:00Z",
      }),
      idle: status({ status: "idle" }),
    };
    const items = filterAttentionAgents(statuses, "self");
    assert.deepEqual(
      items.map((item) => item.agentId),
      ["wait", "fail", "done"],
    );
    assert.deepEqual(
      items.map((item) => item.kind),
      ["permission", "error", "finished"],
    );
  });

  it("returns empty when statuses missing", () => {
    assert.deepEqual(filterAttentionAgents(undefined, "a"), []);
  });
});

describe("attentionPillTint", () => {
  it("prefers permission, then error, then finished", () => {
    assert.equal(attentionPillTint([]), null);
    assert.equal(
      attentionPillTint([
        { agentId: "a", kind: "finished", permissionCount: 0, updatedAt: null },
      ]),
      "finished",
    );
    assert.equal(
      attentionPillTint([
        { agentId: "a", kind: "finished", permissionCount: 0, updatedAt: null },
        { agentId: "b", kind: "error", permissionCount: 0, updatedAt: null },
      ]),
      "error",
    );
    assert.equal(
      attentionPillTint([
        { agentId: "a", kind: "finished", permissionCount: 0, updatedAt: null },
        { agentId: "b", kind: "error", permissionCount: 0, updatedAt: null },
        { agentId: "c", kind: "permission", permissionCount: 1, updatedAt: null },
      ]),
      "permission",
    );
  });
});

describe("attentionPillIconName", () => {
  it("maps tint to lucide names", () => {
    assert.equal(attentionPillIconName(null), "Bell");
    assert.equal(attentionPillIconName("permission"), "Bell");
    assert.equal(attentionPillIconName("error"), "CircleAlert");
    assert.equal(attentionPillIconName("finished"), "CircleCheck");
  });
});
