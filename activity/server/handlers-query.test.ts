import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { PluginHandlerContext } from "@getpaseo/plugin/server";
import {
  createActivityByDayHandler,
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

test("skills-by-name never awaits agent.refresh", async () => {
  const dir = mkdtempSync(join(tmpdir(), "fast-skills-"));
  const store = createUsageStore({ dir, driver: "sqlite" });
  let refreshed = 0;
  const paseo = {
    agents: {
      ref: () => ({
        current: () => null,
        refresh: async () => {
          refreshed += 1;
        },
      }),
    },
  } as unknown as PaseoApi;
  try {
    store.upsertMany([row()]);
    const result = await createSkillsByNameHandler(store)({ agentId: "a1" }, { paseo });
    assert.equal(result.items[0]?.skillName, "demo");
    assert.equal(refreshed, 0);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
