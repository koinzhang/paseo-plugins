import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { PluginHandlerContext } from "@getpaseo/plugin/server";
import {
  createActivityByDayHandler,
  createAgentsHandler,
  createByProviderHandler,
  createSkillsByNameHandler,
} from "./handlers.ts";
import { createUsageStore, type ToolCallRow } from "./store.ts";

type PaseoApi = PluginHandlerContext["paseo"];

function row(over: Partial<ToolCallRow> = {}): ToolCallRow {
  return {
    agentId: "a1",
    callId: "c1",
    workspaceId: "w1",
    provider: "codex",
    turnId: null,
    name: "Skill",
    detailType: null,
    category: "skill",
    confidence: "exact",
    skillName: "demo",
    mcpServer: null,
    mcpTool: null,
    command: null,
    filePath: null,
    status: "completed",
    errorMessage: null,
    seq: null,
    ts: "2026-09-19T12:00:00.000Z",
    ingestedAt: "2026-09-19T12:00:00.000Z",
    ...over,
  };
}

test("by-provider and activity-by-day read the local store only", async () => {
  const dir = mkdtempSync(join(tmpdir(), "fast-query-"));
  const store = createUsageStore({ dir, driver: "sqlite" });
  try {
    store.upsertMany([row()]);
    store.upsertAgents([{
      agentId: "a1",
      workspaceId: "w1",
      parentAgentId: null,
      provider: "codex",
      title: null,
      createdAt: "2026-09-19T12:00:00.000Z",
      archivedAt: null,
      updatedAt: "2026-09-19T12:00:00.000Z",
    }]);
    const providers = await createByProviderHandler(store)({});
    assert.equal(providers.providers[0]?.agentCount, 1);
    assert.equal(providers.providers[0]?.skills[0]?.skillName, "demo");
    const activity = await createActivityByDayHandler(store)({});
    assert.equal(activity.days[0]?.skills, 1);
    assert.equal(activity.days[0]?.agents, 1);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("usage.agents filters by workspace and merges the registry", async () => {
  const dir = mkdtempSync(join(tmpdir(), "fast-agents-"));
  const store = createUsageStore({ dir, driver: "sqlite" });
  try {
    store.upsertMany([
      row({ agentId: "a1", callId: "c1", workspaceId: "w1" }),
      row({ agentId: "a2", callId: "c2", workspaceId: "w2" }),
    ]);
    store.upsertAgents([
      {
        agentId: "a1",
        workspaceId: "w1",
        parentAgentId: null,
        provider: "codex",
        title: "Alpha",
        createdAt: "2026-09-19T10:00:00.000Z",
        archivedAt: null,
        updatedAt: "2026-09-19T10:00:00.000Z",
      },
      {
        agentId: "a2",
        workspaceId: "w2",
        parentAgentId: null,
        provider: "codex",
        title: "Beta",
        createdAt: "2026-09-19T10:00:00.000Z",
        archivedAt: null,
        updatedAt: "2026-09-19T10:00:00.000Z",
      },
      {
        agentId: "a3",
        workspaceId: "w1",
        parentAgentId: null,
        provider: "codex",
        title: "Archived",
        createdAt: "2026-09-19T09:00:00.000Z",
        archivedAt: "2026-09-19T11:00:00.000Z",
        updatedAt: "2026-09-19T11:00:00.000Z",
      },
    ]);
    const result = await createAgentsHandler(store)({ workspaceId: "w1" });
    assert.deepEqual(
      result.items.map((item) => item.agentId),
      ["a1", "a3"],
    );
    assert.equal(result.items[0]?.title, "Alpha");
    assert.equal(result.items[0]?.callCount, 1);
    assert.equal(result.items[0]?.skillCalls, 1);
    assert.equal(result.items[0]?.archivedAt, null);
    assert.equal(result.items[0]?.updatedAt, "2026-09-19T10:00:00.000Z");
    assert.equal(result.items[1]?.archivedAt, "2026-09-19T11:00:00.000Z");
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("skills-by-name refreshes an empty handle and resolves project skills", async () => {
  const dir = mkdtempSync(join(tmpdir(), "fast-skills-"));
  const store = createUsageStore({ dir, driver: "sqlite" });
  let refreshed = 0;
  const paseo = {
    agents: {
      ref: () => ({
        current: () => null,
        refresh: async () => {
          refreshed += 1;
          return { agent: { id: "a1", provider: "codex", cwd: dir } };
        },
      }),
    },
  } as unknown as PaseoApi;
  try {
    mkdirSync(join(dir, ".claude/skills/demo"), { recursive: true });
    writeFileSync(join(dir, ".claude/skills/demo/SKILL.md"), "# Demo");
    store.upsertMany([row()]);
    const result = await createSkillsByNameHandler(store)({ agentId: "a1" }, { paseo });
    assert.equal(result.items[0]?.skillName, "demo");
    assert.equal(refreshed, 1);
    assert.equal(result.items[0]?.skillPath, join(dir, ".claude/skills/demo/SKILL.md"));
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("skills-by-name keeps counts when agent metadata is unavailable", async () => {
  const dir = mkdtempSync(join(tmpdir(), "missing-agent-"));
  const store = createUsageStore({ dir, driver: "sqlite" });
  const paseo = { agents: { ref: () => ({
    current: () => null,
    refresh: async () => null,
  }) } } as unknown as PaseoApi;
  try {
    store.upsertMany([row()]);
    const result = await createSkillsByNameHandler(store)({ agentId: "a1" }, { paseo });
    assert.equal(result.items[0]?.skillName, "demo");
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
