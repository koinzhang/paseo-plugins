import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { agentsFromToolCalls, agentRowFromHook } from "./agents.ts";
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
