import assert from "node:assert/strict";
import { test } from "node:test";
import { formatAgentMeta } from "./filters.ts";
import type { AgentShowField, AgentStatusInfo } from "./constants.ts";
import type { AgentUsageItem } from "../../shared/usage.ts";

const item = {
  agentId: "a1",
  provider: "codex",
  title: "Hello",
  callCount: 3,
  skillCalls: 0,
  mcpCalls: 0,
  shellCalls: 0,
  fileReads: 0,
  fileWrites: 0,
  messageCount: 5,
  coding: false,
  createdAt: "2026-09-20T00:00:00.000Z",
  updatedAt: "2026-09-20T01:00:00.000Z",
  archivedAt: null,
  parentAgentId: null,
  lastActivityAt: "2026-09-20T01:00:00.000Z",
} satisfies AgentUsageItem;

function fields(...ids: AgentShowField[]): ReadonlySet<AgentShowField> {
  return new Set(ids);
}

test("formatAgentMeta joins selected fields; prompt last", () => {
  const byId: Record<string, AgentStatusInfo> = {
    a1: {
      rank: 2,
      updatedAt: "2026-09-20T01:00:00.000Z",
      status: "idle",
      permissionCount: 0,
      requiresAttention: false,
      attentionReason: null,
      parentAgentId: null,
    },
  };
  assert.equal(formatAgentMeta(item, fields(), byId, "en-US"), null);
  assert.equal(
    formatAgentMeta(item, fields("messages", "prompt"), byId, "en-US", "ship it"),
    "5 prompts · ship it",
  );
  assert.equal(
    formatAgentMeta(item, fields("prompt"), byId, "en-US", null),
    null,
  );
  assert.equal(
    formatAgentMeta(item, fields("prompt"), byId, "en-US", "…"),
    "…",
  );
  assert.equal(
    formatAgentMeta(item, fields("calls", "prompt"), byId, "en-US", ""),
    "3 calls",
  );
});
