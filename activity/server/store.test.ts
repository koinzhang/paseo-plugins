import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { createUsageStore, SCHEMA_SQL, type ToolCallRow } from "./store.ts";

const dirs: string[] = [];

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "tool-usage-test-"));
  dirs.push(dir);
  return dir;
}

after(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

function row(overrides: Partial<ToolCallRow> = {}): ToolCallRow {
  return {
    agentId: "agent-1",
    callId: "call-1",
    workspaceId: "ws-1",
    provider: "claude",
    turnId: "turn-1",
    name: "Bash",
    detailType: "shell",
    category: "regular",
    confidence: null,
    skillName: null,
    mcpServer: null,
    mcpTool: null,
    command: "git status",
    filePath: null,
    status: "running",
    errorMessage: null,
    seq: null,
    ts: null,
    ingestedAt: "2026-09-18T12:00:00.000Z",
    ...overrides,
  };
}

test("prefers sqlite driver when node:sqlite is available", () => {
  const store = createUsageStore({ dir: tempDir() });
  assert.equal(store.driver, "sqlite");
  store.close();
});

test("sqlite: upgrades the pre-090 schema and preserves custom-root read attribution", () => {
  const dir = tempDir();
  const database = new DatabaseSync(join(dir, "usage.db"));
  database.exec(SCHEMA_SQL.replace("  skill_uses     TEXT,\n", ""));
  const insert = database.prepare("INSERT INTO tool_calls (agent_id,call_id,provider,name,detail_type,category,confidence,skill_name,command,file_path,ingested_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
  insert.run("a1", "shell", "codex", "shell", "shell", "skill", "low", "first", "cat .agents/skills/first/SKILL.md .agents/skills/second/SKILL.md", null, "2026-11-28T00:00:00Z");
  insert.run("a1", "read", "pi", "read", "read", "skill", "inferred", "custom", null, "/custom/skills/custom/SKILL.md", "2026-11-28T00:00:00Z");
  database.close();
  const store = createUsageStore({ dir, driver: "sqlite" });
  assert.equal(store.getRow("a1", "shell")?.skillUses?.length, 2);
  assert.equal(store.getRow("a1", "read")?.skillUses?.[0]?.confidence, "inferred");
  assert.equal(store.count(), 2);
  store.close();
});

for (const driver of ["sqlite", "jsonl"] as const) {
  test(`${driver}: multiple skill evidence persists, filters and replaces without inflating tool count`, () => {
    const dir = tempDir();
    const store = createUsageStore({ dir, driver });
    const skillUses = [
      { skillName: "first", confidence: "inferred" as const, filePath: ".agents/skills/first/SKILL.md" },
      { skillName: "second", confidence: "inferred" as const, filePath: ".agents/skills/second/SKILL.md" },
      { skillName: "search", confidence: "low" as const, filePath: ".agents/skills/search/SKILL.md" },
    ];
    store.upsertMany([row({ category: "skill", confidence: "inferred", skillName: "first", skillUses })]);
    store.upsertMany([row({ category: "skill", confidence: "inferred", skillName: "first", skillUses })]);
    assert.equal(store.count(), 1);
    assert.equal(store.select({ skillName: "second" }).length, 1);
    assert.equal(store.select({ skillName: "search", confidence: "low" }).length, 1);
    assert.equal(store.select({ skillName: "second", confidence: "low" }).length, 0);
    assert.equal(store.selectRecent({ category: "skill" }, { limit: 10, scope: "skill-named" }).length, 1);
    store.close();
    const reopened = createUsageStore({ dir, driver });
    assert.deepEqual(reopened.getRow("agent-1", "call-1")?.skillUses, skillUses);
    reopened.upsertMany([row({ category: "regular", skillUses: [] })]);
    assert.equal(reopened.select({ skillName: "second" }).length, 0);
    reopened.close();
  });

  test(`${driver}: startup migrates old shell reads without changing identity, time or status`, () => {
    const dir = tempDir();
    const store = createUsageStore({ dir, driver });
    const original = row({ category: "skill", confidence: "low", skillName: "first", command: "cat .agents/skills/first/SKILL.md .agents/skills/second/SKILL.md", ts: "2026-09-18T11:00:00.000Z", status: "completed" });
    store.upsertMany([original]);
    store.close();
    const migrated = createUsageStore({ dir, driver });
    const current = migrated.getRow("agent-1", "call-1")!;
    assert.equal(current.confidence, "inferred");
    assert.equal(current.skillUses?.length, 2);
    assert.equal(current.ts, original.ts);
    assert.equal(current.ingestedAt, original.ingestedAt);
    assert.equal(current.status, original.status);
    assert.equal(migrated.count(), 1);
    migrated.close();
    const repeated = createUsageStore({ dir, driver });
    assert.equal(repeated.generation(), 0);
    repeated.close();
  });
}

test("sqlite: repeated upsert of same agentId+callId stays one row", () => {
  const store = createUsageStore({ dir: tempDir() });
  store.upsertMany([row()]);
  store.upsertMany([row()]);
  assert.equal(store.count(), 1);
  store.close();
});

test("sqlite: running -> completed keeps final status", () => {
  const store = createUsageStore({ dir: tempDir() });
  store.upsertMany([row({ status: "running" })]);
  store.upsertMany([row({ status: "completed" })]);
  assert.equal(store.getRow("agent-1", "call-1")?.status, "completed");
  assert.equal(store.count(), 1);
  store.close();
});

test("sqlite: late running event does not downgrade terminal status", () => {
  const store = createUsageStore({ dir: tempDir() });
  store.upsertMany([row({ status: "completed" })]);
  store.upsertMany([row({ status: "running" })]);
  assert.equal(store.getRow("agent-1", "call-1")?.status, "completed");
  store.close();
});

test("sqlite: failed error message is stored", () => {
  const store = createUsageStore({ dir: tempDir() });
  store.upsertMany([row({ status: "failed", errorMessage: "exit 1" })]);
  assert.equal(store.getRow("agent-1", "call-1")?.errorMessage, "exit 1");
  store.close();
});

test("sqlite: data survives close and reopen", () => {
  const dir = tempDir();
  const first = createUsageStore({ dir });
  first.upsertMany([row({ status: "completed" })]);
  first.close();
  const second = createUsageStore({ dir });
  assert.equal(second.count(), 1);
  assert.equal(second.getRow("agent-1", "call-1")?.status, "completed");
  second.close();
});

test("jsonl fallback: repeated upsert stays one row and persists", () => {
  const dir = tempDir();
  const store = createUsageStore({ dir, driver: "jsonl" });
  assert.equal(store.driver, "jsonl");
  store.upsertMany([row({ status: "running" })]);
  store.upsertMany([row({ status: "completed" })]);
  assert.equal(store.count(), 1);
  assert.equal(store.getRow("agent-1", "call-1")?.status, "completed");
  store.close();

  const reopened = createUsageStore({ dir, driver: "jsonl" });
  assert.equal(reopened.count(), 1);
  assert.equal(reopened.getRow("agent-1", "call-1")?.status, "completed");
  reopened.close();
});

test("jsonl fallback: late running event does not downgrade terminal status", () => {
  const store = createUsageStore({ dir: tempDir(), driver: "jsonl" });
  store.upsertMany([row({ status: "failed", errorMessage: "boom" })]);
  store.upsertMany([row({ status: "running" })]);
  const stored = store.getRow("agent-1", "call-1");
  assert.equal(stored?.status, "failed");
  assert.equal(stored?.errorMessage, "boom");
  store.close();
});

test("sqlite: upsertAgents keeps earliest createdAt and sets archivedAt", () => {
  const store = createUsageStore({ dir: tempDir() });
  store.upsertAgents([
    {
      agentId: "a1",
      workspaceId: "w1",
      parentAgentId: null,
      provider: "claude",
      title: "One",
      createdAt: "2026-09-18T12:00:00.000Z",
      archivedAt: null,
      updatedAt: "2026-09-18T12:00:00.000Z",
    },
  ]);
  store.upsertAgents([
    {
      agentId: "a1",
      workspaceId: "w1",
      parentAgentId: null,
      provider: "claude",
      title: "One renamed",
      createdAt: "2026-09-19T12:00:00.000Z",
      archivedAt: "2026-09-20T00:00:00.000Z",
      updatedAt: "2026-09-20T00:00:00.000Z",
    },
  ]);
  const agent = store.getAgent("a1");
  assert.equal(agent?.createdAt, "2026-09-18T12:00:00.000Z");
  assert.equal(agent?.archivedAt, "2026-09-20T00:00:00.000Z");
  assert.equal(agent?.title, "One renamed");
  assert.equal(store.selectAgents({ from: "2026-09-18T00:00:00.000Z" }).length, 1);
  store.upsertAgents([
    {
      agentId: "a1",
      workspaceId: "w1",
      parentAgentId: null,
      provider: "claude",
      title: "One renamed",
      createdAt: "2026-09-19T12:00:00.000Z",
      archivedAt: null,
      updatedAt: "2026-09-20T01:00:00.000Z",
    },
  ]);
  assert.equal(store.getAgent("a1")?.archivedAt, null);
  store.close();
});

test("sqlite: category reclassify clears dependent fields", () => {
  const store = createUsageStore({ dir: tempDir() });
  store.upsertMany([
    row({
      category: "skill",
      confidence: "exact",
      skillName: "demo",
      command: null,
    }),
  ]);
  store.upsertMany([
    row({
      category: "regular",
      confidence: null,
      skillName: null,
      command: "echo hi",
    }),
  ]);
  const stored = store.getRow("agent-1", "call-1");
  assert.equal(stored?.category, "regular");
  assert.equal(stored?.confidence, null);
  assert.equal(stored?.skillName, null);
  assert.equal(stored?.command, "echo hi");
  store.close();
});

test("sqlite: select pushes agentId and time filters", () => {
  const store = createUsageStore({ dir: tempDir() });
  store.upsertMany([
    row({ callId: "a", agentId: "agent-1", ingestedAt: "2026-09-18T12:00:00.000Z" }),
    row({ callId: "b", agentId: "agent-2", ingestedAt: "2026-09-19T12:00:00.000Z" }),
  ]);
  assert.equal(store.select({ agentId: "agent-1" }).length, 1);
  assert.equal(store.select({ from: "2026-09-19T00:00:00.000Z" }).length, 1);
  store.close();
});

test("sqlite: epoch replace deletes canonical user messages", () => {
  const store = createUsageStore({ dir: tempDir() });
  store.upsertUserMessages([
    {
      agentId: "agent-1",
      messageId: "canonical:abc",
      workspaceId: "ws",
      provider: "codex",
      model: "gpt-5.4",
      turnId: null,
      seq: 1,
      ts: null,
      ingestedAt: "2026-09-18T12:00:00.000Z",
    },
    {
      agentId: "agent-1",
      messageId: "real-id",
      workspaceId: "ws",
      provider: "codex",
      model: null,
      turnId: null,
      seq: 2,
      ts: null,
      ingestedAt: "2026-09-18T12:00:00.000Z",
    },
  ]);
  assert.equal(store.deleteCanonicalUserMessages("agent-1"), 1);
  assert.equal(store.selectUserMessages({ agentId: "agent-1" }).length, 1);
  assert.equal(store.selectUserMessages({ agentId: "agent-1" })[0]?.messageId, "real-id");
  store.close();
});

for (const driver of ["sqlite", "jsonl"] as const) {
  test(`${driver}: selectRecent / countRows page newest-first with scopes (064)`, () => {
    const store = createUsageStore({ dir: tempDir(), driver });
    store.upsertMany([
      row({ callId: "a", ts: "2026-09-18T01:00:00.000Z", category: "skill", skillName: "alpha", confidence: "exact" }),
      row({ callId: "b", ts: "2026-09-18T03:00:00.000Z", category: "skill", skillName: "low", confidence: "low" }),
      row({ callId: "c", ts: "2026-09-18T02:00:00.000Z", category: "skill", skillName: "  ", confidence: "exact" }),
      row({ callId: "d", ts: null, ingestedAt: "2026-09-18T04:00:00.000Z", category: "skill", skillName: "beta", confidence: "inferred" }),
      row({ callId: "e", ts: "2026-09-18T05:00:00.000Z", workspaceId: "ws-2", category: "skill", skillName: "other", confidence: "exact" }),
      row({ callId: "f", ts: "2026-09-18T02:00:00.000Z", category: "mcp", mcpServer: "paseo", mcpTool: "list" }),
      row({ callId: "g", ts: "2026-09-18T06:00:00.000Z", category: "mcp", mcpServer: "paseo", mcpTool: null }),
    ]);
    const skill = { workspaceId: "ws-1", category: "skill" as const };
    assert.deepEqual(
      store.selectRecent(skill, { limit: 10, scope: "skill-named" }).map((r) => r.callId),
      ["d", "a"],
    );
    assert.deepEqual(
      store.selectRecent({ workspaceId: "ws-1", category: "mcp" }, { limit: 10, scope: "mcp-named" })
        .map((r) => r.callId),
      ["f"],
    );
    assert.deepEqual(
      store.selectRecent({ workspaceId: "ws-1" }, { limit: 2, offset: 1 }).map((r) => r.callId),
      ["d", "b"],
    );
    assert.equal(store.countRows({ workspaceId: "ws-1" }), 6);
    assert.equal(store.countRows(skill), 4);
    store.close();
  });

  test(`${driver}: generation, activity spans and terminal call ids (064)`, () => {
    const store = createUsageStore({ dir: tempDir(), driver });
    const g0 = store.generation();
    store.upsertMany([
      row({ callId: "x", ts: "2026-09-18T05:00:00.000Z", status: "completed", provider: "codex", workspaceId: "late" }),
      row({ callId: "y", ts: "2026-09-18T01:00:00.000Z", status: "running", provider: "claude", workspaceId: "early" }),
      row({ agentId: "agent-2", callId: "z", ts: "2026-09-18T02:00:00.000Z", status: "failed" }),
    ]);
    assert.ok(store.generation() > g0);
    const g1 = store.generation();
    store.select();
    assert.equal(store.generation(), g1, "reads do not bump generation");
    const spans = store.agentActivitySpans().sort((a, b) => a.agentId.localeCompare(b.agentId));
    assert.deepEqual(spans[0], {
      agentId: "agent-1",
      provider: "claude",
      workspaceId: "early",
      firstAt: "2026-09-18T01:00:00.000Z",
      lastAt: "2026-09-18T05:00:00.000Z",
    });
    assert.equal(spans.length, 2);
    assert.deepEqual([...store.terminalCallIds("agent-1")], ["x"]);
    assert.deepEqual([...store.terminalCallIds("agent-2")], ["z"]);
    store.close();
  });

  test(`${driver}: rescans keep the earliest event time, never after first ingest (074)`, () => {
    const store = createUsageStore({ dir: tempDir(), driver });
    const ts = (callId: string) => store.getRow("agent-1", callId)?.ts ?? null;
    store.upsertMany([
      row({ callId: "known", ts: "2026-09-18T10:00:00.000Z" }),
      row({ callId: "live", ts: null }),
      row({ callId: "live-real", ts: null }),
    ]);
    store.upsertMany([
      row({ callId: "known", ts: "2026-09-20T08:00:00.000Z", ingestedAt: "2026-09-20T08:00:01.000Z" }),
      row({ callId: "live", ts: "2026-09-20T08:00:00.000Z", ingestedAt: "2026-09-20T08:00:01.000Z" }),
      row({ callId: "live-real", ts: "2026-09-18T11:30:00.000Z" }),
    ]);
    assert.equal(ts("known"), "2026-09-18T10:00:00.000Z");
    assert.equal(ts("live"), null);
    assert.equal(ts("live-real"), "2026-09-18T11:30:00.000Z");
    store.upsertMany([row({ callId: "known", ts: "2026-09-18T09:00:00.000Z" }), row({ callId: "known", ts: null })]);
    assert.equal(ts("known"), "2026-09-18T09:00:00.000Z");

    const message = {
      agentId: "agent-1",
      messageId: "m1",
      workspaceId: "ws",
      provider: "cursor",
      model: null,
      turnId: null,
      seq: 1,
      ts: null,
      ingestedAt: "2026-09-18T12:00:00.000Z",
    };
    store.upsertUserMessages([message]);
    store.upsertUserMessages([{ ...message, ts: "2026-09-20T08:00:00.000Z", ingestedAt: "2026-09-20T08:00:01.000Z" }]);
    assert.equal(store.selectUserMessages({ agentId: "agent-1" })[0]?.ts, null);
    store.upsertUserMessages([{ ...message, ts: "2026-09-18T11:00:00.000Z" }]);
    assert.equal(store.selectUserMessages({ agentId: "agent-1" })[0]?.ts, "2026-09-18T11:00:00.000Z");
    store.close();
  });

  test(`${driver}: reopening clears event times later than first ingest (074)`, () => {
    const dir = tempDir();
    const store = createUsageStore({ dir, driver });
    store.upsertMany([
      row({ callId: "stamped", ts: "2026-09-20T08:00:00.000Z" }),
      row({ callId: "fine", ts: "2026-09-18T11:00:00.000Z" }),
    ]);
    store.upsertUserMessages([{
      agentId: "agent-1",
      messageId: "m1",
      workspaceId: "ws",
      provider: "cursor",
      model: null,
      turnId: null,
      seq: 1,
      ts: "2026-09-20T08:00:00.000Z",
      ingestedAt: "2026-09-18T12:00:00.000Z",
    }]);
    store.close();
    const reopened = createUsageStore({ dir, driver });
    assert.equal(reopened.getRow("agent-1", "stamped")?.ts, null);
    assert.equal(reopened.getRow("agent-1", "fine")?.ts, "2026-09-18T11:00:00.000Z");
    assert.equal(reopened.selectUserMessages({ agentId: "agent-1" })[0]?.ts, null);
    reopened.close();
  });
}
