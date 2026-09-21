import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { PluginHandlerContext } from "@getpaseo/plugin/server";
import {
  createActivityByHourHandler,
  createActivityByDayHandler,
  createAgentCreationsHandler,
  createAgentLifetimeHandler,
  createAgentsHandler,
  createByProviderHandler,
  createRecentMcpCallsHandler,
  createRecentSkillCallsHandler,
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
    const hourly = await createActivityByHourHandler(
      store,
      () => new Date("2026-09-19T12:30:00.000Z"),
    )({ hours: 2 });
    assert.equal(hourly.hours.length, 2);
    assert.equal(hourly.hours[0]?.start, "2026-09-19T11:00:00.000Z");
    assert.equal(hourly.hours[0]?.total, 0);
    assert.equal(hourly.hours[1]?.skills, 1);
    assert.equal(hourly.hours[1]?.agents, 1);
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

test("recent skill calls returns newest workspace calls with agent titles", async () => {
  const dir = mkdtempSync(join(tmpdir(), "recent-skills-"));
  const store = createUsageStore({ dir, driver: "sqlite" });
  try {
    store.upsertMany([
      row({ agentId: "a1", callId: "older", skillName: "review", ts: "2026-09-19T10:00:00.000Z" }),
      row({ agentId: "a2", callId: "newer", skillName: "paseo", ts: "2026-09-19T12:00:00.000Z" }),
      row({
        agentId: "a1",
        callId: "low",
        skillName: "reference-only",
        confidence: "low",
        ts: "2026-09-19T13:00:00.000Z",
      }),
      row({
        agentId: "other",
        callId: "other-workspace",
        workspaceId: "w2",
        ts: "2026-09-19T14:00:00.000Z",
      }),
    ]);
    store.upsertAgents([
      {
        agentId: "a1",
        workspaceId: "w1",
        parentAgentId: null,
        provider: "codex",
        title: "Alpha",
        createdAt: "2026-09-19T09:00:00.000Z",
        archivedAt: null,
        updatedAt: "2026-09-19T10:00:00.000Z",
      },
      {
        agentId: "a2",
        workspaceId: "w1",
        parentAgentId: null,
        provider: "codex",
        title: null,
        createdAt: "2026-09-19T09:00:00.000Z",
        archivedAt: null,
        updatedAt: "2026-09-19T12:00:00.000Z",
      },
    ]);

    const result = await createRecentSkillCallsHandler(store)({
      workspaceId: "w1",
      limit: 2,
    });
    assert.deepEqual(
      result.items.map((item) => [
        item.callId,
        item.skillName,
        item.agentTitle,
        item.calledAt,
      ]),
      [
        ["newer", "paseo", null, "2026-09-19T12:00:00.000Z"],
        ["older", "review", "Alpha", "2026-09-19T10:00:00.000Z"],
      ],
    );
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("recent MCP calls returns newest workspace calls with agent titles", async () => {
  const dir = mkdtempSync(join(tmpdir(), "recent-mcp-"));
  const store = createUsageStore({ dir, driver: "sqlite" });
  try {
    store.upsertMany([
      row({
        agentId: "a1",
        callId: "older",
        category: "mcp",
        skillName: null,
        mcpServer: "github",
        mcpTool: "search",
        ts: "2026-09-19T10:00:00.000Z",
      }),
      row({
        agentId: "a2",
        callId: "newer",
        category: "mcp",
        skillName: null,
        mcpServer: "paseo",
        mcpTool: "list_agents",
        ts: "2026-09-19T12:00:00.000Z",
      }),
      row({
        agentId: "other",
        callId: "other-workspace",
        workspaceId: "w2",
        category: "mcp",
        skillName: null,
        mcpServer: "other",
        mcpTool: "tool",
        ts: "2026-09-19T14:00:00.000Z",
      }),
    ]);
    store.upsertAgents([
      {
        agentId: "a1",
        workspaceId: "w1",
        parentAgentId: null,
        provider: "codex",
        title: "Alpha",
        createdAt: "2026-09-19T09:00:00.000Z",
        archivedAt: null,
        updatedAt: "2026-09-19T10:00:00.000Z",
      },
    ]);

    const result = await createRecentMcpCallsHandler(store)({
      workspaceId: "w1",
      limit: 2,
    });
    assert.deepEqual(
      result.items.map((item) => [
        item.callId,
        `${item.server}.${item.tool}`,
        item.agentTitle,
      ]),
      [
        ["newer", "paseo.list_agents", null],
        ["older", "github.search", "Alpha"],
      ],
    );
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("usage.agent-lifetime reads spans from the registry, active agents included", async () => {
  const dir = mkdtempSync(join(tmpdir(), "fast-lifetime-"));
  const store = createUsageStore({ dir, driver: "sqlite" });
  const registryRow = (
    agentId: string,
    provider: string,
    createdAt: string,
    archivedAt: string | null,
  ) => ({
    agentId,
    workspaceId: "w1",
    parentAgentId: null,
    provider,
    title: agentId,
    createdAt,
    archivedAt,
    updatedAt: archivedAt ?? createdAt,
  });
  try {
    store.upsertAgents([
      registryRow("codex-old", "codex", "2026-09-07T03:34:09.656Z", "2026-09-18T17:18:18.001Z"),
      registryRow("claude-long", "claude", "2026-09-08T03:09:29.070Z", "2026-09-19T17:18:17.939Z"),
      registryRow("active", "claude", "2026-09-01T00:00:00.000Z", null),
    ]);
    const all = await createAgentLifetimeHandler(store)({});
    // `active` spans created→now, which is wider than either archived span.
    assert.equal(all.longest?.agentId, "active");
    assert.equal(all.longest?.archivedAt, null);
    assert.equal(all.sampleSize, 3);

    const codexOnly = await createAgentLifetimeHandler(store)({ provider: "codex" });
    assert.equal(codexOnly.longest?.agentId, "codex-old");
    assert.equal(codexOnly.sampleSize, 1);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("usage.agent-creations buckets registry rows by day and provider", async () => {
  const dir = mkdtempSync(join(tmpdir(), "fast-creations-"));
  const store = createUsageStore({ dir, driver: "sqlite" });
  try {
    store.upsertAgents(
      [
        ["a1", "claude-code", "2026-09-19T01:00:00.000Z"],
        ["a2", "claude", "2026-09-19T02:00:00.000Z"],
        ["a3", "codex", "2026-09-19T03:00:00.000Z"],
        ["a4", "codex", "2026-08-01T03:00:00.000Z"],
      ].map(([agentId, provider, createdAt]) => ({
        agentId: agentId!,
        workspaceId: "w1",
        parentAgentId: null,
        provider: provider!,
        title: agentId!,
        createdAt: createdAt!,
        archivedAt: null,
        updatedAt: createdAt!,
      })),
    );
    const all = await createAgentCreationsHandler(store)({ from: "2026-09-01T00:00:00.000Z" });
    assert.deepEqual(
      all.days.map((day) => [day.date, day.total, day.providers.map((item) => `${item.provider}:${item.count}`)]),
      [["2026-09-19", 3, ["claude:2", "codex:1"]]],
    );

    const codexOnly = await createAgentCreationsHandler(store)({ provider: "codex" });
    assert.deepEqual(codexOnly.days.map((day) => [day.date, day.total]), [
      ["2026-08-01", 1],
      ["2026-09-19", 1],
    ]);
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
