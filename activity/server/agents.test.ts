import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { agentsFromToolCalls, agentRowFromHook, agentRowFromSnapshot } from "./agents.ts";
import type { ToolCallRow } from "./store.ts";

function row(over: Partial<ToolCallRow> = {}): ToolCallRow {
  return {
    agentId: "a1",
    callId: "c1",
    workspaceId: "w1",
    provider: "claude",
    turnId: null,
    name: "Bash",
    detailType: "shell",
    category: "regular",
    confidence: null,
    skillName: null,
    mcpServer: null,
    mcpTool: null,
    command: "ls",
    filePath: null,
    status: "completed",
    errorMessage: null,
    seq: null,
    ts: null,
    ingestedAt: "2026-09-18T12:00:00.000Z",
    ...over,
  };
}

describe("agentsFromToolCalls", () => {
  it("uses earliest activity as approximate createdAt", () => {
    const agents = agentsFromToolCalls([
      row({ callId: "1", agentId: "a1", ingestedAt: "2026-09-18T12:00:00.000Z" }),
      row({
        callId: "2",
        agentId: "a1",
        ts: "2026-09-17T08:00:00.000Z",
        ingestedAt: "2026-09-18T12:00:00.000Z",
      }),
      row({ callId: "3", agentId: "a2", provider: "codex", ingestedAt: "2026-09-19T01:00:00.000Z" }),
    ]);
    assert.equal(agents.length, 2);
    const a1 = agents.find((a) => a.agentId === "a1");
    assert.equal(a1?.createdAt, "2026-09-17T08:00:00.000Z");
    assert.equal(a1?.provider, "claude");
  });
});

describe("agentRowFromHook", () => {
  it("maps hook agent fields", () => {
    const row = agentRowFromHook(
      {
        id: "x",
        workspaceId: "w",
        parentAgentId: null,
        provider: "claude",
        cwd: "/tmp",
        title: "Hello",
      },
      { createdAt: "2026-09-18T00:00:00.000Z" },
    );
    assert.equal(row.agentId, "x");
    assert.equal(row.title, "Hello");
    assert.equal(row.createdAt, "2026-09-18T00:00:00.000Z");
  });
});

describe("agentRowFromSnapshot", () => {
  it("passes through archivedAt", () => {
    const active = agentRowFromSnapshot({
      id: "a1",
      provider: "claude",
      createdAt: "2026-09-18T00:00:00.000Z",
      archivedAt: null,
    });
    assert.equal(active.archivedAt, null);
    const archived = agentRowFromSnapshot({
      id: "a2",
      provider: "claude",
      createdAt: "2026-09-18T00:00:00.000Z",
      archivedAt: "2026-09-19T00:00:00.000Z",
    });
    assert.equal(archived.archivedAt, "2026-09-19T00:00:00.000Z");
  });
});

describe("agent activity timestamps", () => {
  it("preserves snapshot time and uses creation time only when absent", () => {
    const agent = { id: "a", provider: "codex", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z" };
    assert.equal(agentRowFromSnapshot(agent).updatedAt, agent.updatedAt);
    assert.equal(agentRowFromSnapshot({ ...agent, updatedAt: undefined }).updatedAt, agent.createdAt);
  });
  it("derives last activity from tool history regardless of input order", () => {
    const calls = [row({ ts: "2026-01-03T00:00:00Z" }), row({ ts: "2026-01-01T00:00:00Z" }), row({ ts: "2026-01-04T00:00:00Z" })];
    for (const ordered of [calls, calls.slice().reverse()]) {
      const agent = agentsFromToolCalls(ordered)[0]!;
      assert.equal(agent.createdAt, "2026-01-01T00:00:00Z");
      assert.equal(agent.updatedAt, "2026-01-04T00:00:00Z");
    }
  });
});
