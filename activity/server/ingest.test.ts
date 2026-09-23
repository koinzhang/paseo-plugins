import assert from "node:assert/strict";
import { test } from "node:test";
import type { AgentTimelineItem } from "./host-types.ts";
import type { PluginHookAgent } from "@getpaseo/plugin/server";
import { ingestTimeline } from "./ingest.ts";
import type { ToolCallRow, UsageStore } from "./store.ts";

const agent: PluginHookAgent = {
  id: "agent-1",
  workspaceId: "ws-1",
  parentAgentId: null,
  provider: "claude",
  cwd: "/repo",
  title: "test agent",
};

const FIXED_NOW = "2026-09-18T12:00:00.000Z";
const fixedNow = () => new Date(FIXED_NOW);

function fakeStore(): UsageStore & { rows: ToolCallRow[] } {
  const rows: ToolCallRow[] = [];
  const index = new Map<string, number>();
  const agents = new Map<string, import("./store.ts").AgentRow>();
  const sync = new Map<string, { agentId: string; epoch: string; lastSeq: number; updatedAt: string }>();
  return {
    driver: "jsonl",
    upsertUserMessages: () => 0,
    selectUserMessages: () => [],
    rows,
    upsertMany(batch) {
      for (const row of batch) {
        const key = `${row.agentId}\u0000${row.callId}`;
        const at = index.get(key);
        if (at === undefined) {
          index.set(key, rows.length);
          rows.push(row);
        } else {
          rows[at] = row;
        }
      }
      return batch.length;
    },
    count() {
      return rows.length;
    },
    getRow(agentId, callId) {
      return rows.find((row) => row.agentId === agentId && row.callId === callId) ?? null;
    },
    select() {
      return [...rows];
    },
    generation: () => 0,
    selectRecent: () => [],
    countRows: () => rows.length,
    agentActivitySpans: () => [],
    terminalCallIds: () => new Set(),
    upsertAgents(batch) {
      for (const row of batch) agents.set(row.agentId, row);
      return batch.length;
    },
    getAgent(agentId) {
      return agents.get(agentId) ?? null;
    },
    selectAgents() {
      return [...agents.values()];
    },
    getSyncState(agentId) {
      return sync.get(agentId) ?? null;
    },
    setSyncState(agentId, epoch, lastSeq) {
      sync.set(agentId, {
        agentId,
        epoch,
        lastSeq,
        updatedAt: new Date().toISOString(),
      });
    },
    deleteCanonicalUserMessages() {
      return 0;
    },
    close() {},
  };
}

test("ingestTimeline maps only tool_call items", () => {
  const timeline: AgentTimelineItem[] = [
    { type: "user_message", text: "hi" },
    {
      type: "tool_call",
      callId: "call-1",
      name: "Skill",
      detail: { type: "plain_text", label: "paseo-plugin" },
      status: "completed",
      error: null,
    },
    {
      type: "tool_call",
      callId: "call-2",
      name: "Bash",
      detail: { type: "shell", command: "git status", exitCode: 0 },
      status: "completed",
      error: null,
    },
    { type: "assistant_message", text: "done" },
  ];

  const rows = ingestTimeline(timeline, agent, null, {}, fixedNow);

  assert.equal(rows.length, 2);
  const skillRow = rows[0];
  assert.equal(skillRow?.callId, "call-1");
  assert.equal(skillRow?.category, "skill");
  assert.equal(skillRow?.confidence, "exact");
  assert.equal(skillRow?.skillName, "paseo-plugin");
  assert.equal(skillRow?.agentId, "agent-1");
  assert.equal(skillRow?.workspaceId, "ws-1");
  assert.equal(skillRow?.provider, "claude");
  assert.equal(skillRow?.turnId, null);
  assert.equal(skillRow?.ingestedAt, FIXED_NOW);
  assert.equal(skillRow?.seq, null);
  assert.equal(skillRow?.ts, null);
  const shellRow = rows[1];
  assert.equal(shellRow?.category, "regular");
  assert.equal(shellRow?.detailType, "shell");
  assert.equal(shellRow?.command, "git status");
});

test("ingestTimeline stamps explicit turnId for backfill paths", () => {
  const rows = ingestTimeline(
    [
      {
        type: "tool_call",
        callId: "call-turn",
        name: "Bash",
        detail: { type: "shell", command: "ls" },
        status: "completed",
        error: null,
      },
    ],
    agent,
    "turn-1",
    {},
    fixedNow,
  );
  assert.equal(rows[0]?.turnId, "turn-1");
});

test("ingestTimeline captures failure message", () => {
  const rows = ingestTimeline(
    [
      {
        type: "tool_call",
        callId: "call-err",
        name: "Bash",
        detail: { type: "shell", command: "false" },
        status: "failed",
        error: { message: "exit code 1" },
      },
    ],
    agent,
    null,
    {},
    fixedNow,
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.status, "failed");
  assert.equal(rows[0]?.errorMessage, "exit code 1");
});

test("ingestTimeline applies provider-specific mcp rules", () => {
  const rows = ingestTimeline(
    [
      {
        type: "tool_call",
        callId: "call-mcp",
        name: "github.search",
        detail: { type: "unknown", input: {}, output: null },
        status: "completed",
        error: null,
      },
    ],
    { ...agent, provider: "codex" },
    null,
    {},
    fixedNow,
  );

  assert.equal(rows[0]?.category, "mcp");
  assert.equal(rows[0]?.mcpServer, "github");
  assert.equal(rows[0]?.mcpTool, "search");
});

test("ingestTimeline OpenCode MCP uses mcpServers option", () => {
  const rows = ingestTimeline(
    [
      {
        type: "tool_call",
        callId: "call-mobile",
        name: "mobile-mcp_mobile_list_available_devices",
        detail: { type: "unknown", input: {}, output: null },
        status: "completed",
        error: null,
      },
    ],
    { ...agent, provider: "opencode" },
    null,
    { mcpServers: ["mobile-mcp", "paseo"] },
    fixedNow,
  );

  assert.equal(rows[0]?.category, "mcp");
  assert.equal(rows[0]?.mcpServer, "mobile-mcp");
  assert.equal(rows[0]?.mcpTool, "mobile_list_available_devices");
});

test("ingestTimeline rows upsert idempotently through the store", () => {
  const store = fakeStore();
  const timeline: AgentTimelineItem[] = [
    {
      type: "tool_call",
      callId: "call-dup",
      name: "Bash",
      detail: { type: "shell", command: "git status" },
      status: "running",
      error: null,
    },
  ];
  store.upsertMany(ingestTimeline(timeline, agent, null, {}, fixedNow));
  store.upsertMany(ingestTimeline(timeline, agent, null, {}, fixedNow));
  assert.equal(store.count(), 1);
  assert.equal(store.getRow("agent-1", "call-dup")?.status, "running");
});

test("ingestTimeline returns empty array for timelines without tool calls", () => {
  const rows = ingestTimeline([{ type: "user_message", text: "hi" }], agent, null, {}, fixedNow);
  assert.deepEqual(rows, []);
});
