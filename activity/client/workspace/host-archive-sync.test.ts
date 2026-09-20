import assert from "node:assert/strict";
import { test } from "node:test";
import type { AgentUsageItem } from "../../shared/usage.ts";
import { reconcileHostArchive } from "./host-archive-sync.ts";
import { agentStatusInfo } from "./list-host-agents.ts";

function item(agentId: string, archivedAt: string | null = null): AgentUsageItem {
  return {
    agentId,
    provider: "cursor",
    title: agentId,
    callCount: 0,
    skillCalls: 0,
    mcpCalls: 0,
    shellCalls: 0,
    fileReads: 0,
    fileWrites: 0,
    messageCount: 0,
    coding: false,
    createdAt: "2026-09-20T00:00:00.000Z",
    updatedAt: "2026-09-20T00:00:00.000Z",
    archivedAt,
    parentAgentId: null,
    lastActivityAt: null,
  };
}

test("missing host cache and closed status do not synthesize archive", () => {
  const rows = [item("a")];
  assert.equal(reconcileHostArchive(rows, undefined)[0], rows[0]);
  assert.equal(reconcileHostArchive(rows, {})[0], rows[0]);
  const statuses = { a: agentStatusInfo({ id: "a", status: "closed", archivedAt: null }) };
  assert.equal(reconcileHostArchive(rows, statuses)[0]?.archivedAt, null);
});

test("explicit host archive and unarchive override delayed DB results without changing metrics", () => {
  const row = { ...item("a"), callCount: 42 };
  const archived = { a: agentStatusInfo({ id: "a", archivedAt: "2026-09-20T08:30:43.446Z" }) };
  const first = reconcileHostArchive([row], archived)[0]!;
  assert.equal(first.archivedAt, archived.a.archivedAt);
  assert.equal(first.callCount, 42);
  assert.equal(row.archivedAt, null);
  assert.equal(reconcileHostArchive([row], archived)[0]?.archivedAt, first.archivedAt);
  const active = { a: agentStatusInfo({ id: "a", archivedAt: null }) };
  assert.equal(reconcileHostArchive([first], active)[0]?.archivedAt, null);
});
