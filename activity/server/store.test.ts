import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { createUsageStore, type ToolCallRow } from "./store.ts";

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
