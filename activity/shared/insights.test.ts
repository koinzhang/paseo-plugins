import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ACTIVITY_LIST_LIMIT, buildActivityInsights, buildActivityKpi } from "./insights.ts";
import type { ProviderUsageItem } from "./usage.ts";

function provider(partial: Partial<ProviderUsageItem> & Pick<ProviderUsageItem, "provider" | "label">): ProviderUsageItem {
  return {
    shellCalls: 0,
    shellFailures: 0,
    fileReads: 0,
    fileWrites: 0,
    skillCalls: { exact: 0, inferred: 0, low: 0 },
    skills: [],
    mcpCalls: 0,
    mcpFailures: 0,
    mcpTools: [],
    shellTop: [],
    models: [],
    agentCount: 0,
    codingAgentCount: 0,
    chatAgentCount: 0,
    workspaceCount: 0,
    messageCount: 0,
    callCount: 0,
    ...partial,
  };
}

describe("buildActivityInsights", () => {
  // 2026-03-07 Sat, 2026-03-09 Mon — Mon carries more volume → Peak weekday Mon.
  const days = [
    { date: "2026-03-07", skills: 2, mcp: 0, agents: 1, messages: 4, total: 2 },
    { date: "2026-03-09", skills: 0, mcp: 0, agents: 0, messages: 10, total: 0 },
  ];

  it("returns the 8 habit / average rows (072)", () => {
    const rows = buildActivityInsights({
      days: [...days, { date: "2026-03-10", skills: 0, mcp: 1, agents: 0, messages: 0, total: 1 }],
      summary: {
        skills: 2,
        mcp: 3,
        agents: 5,
        messages: 14,
        codingAgents: 3,
        chatAgents: 1,
      },
      workspaces: 7,
      averageSessionMs: 18 * 60_000 + 20_000,
      multiTurn: { multiTurnSessions: 2, promptedSessions: 3 },
      locale: "en",
    });

    assert.equal(rows.length, ACTIVITY_LIST_LIMIT);
    assert.deepEqual(
      rows.map((r) => r.label),
      [
        "Active days",
        "Busiest day",
        "Workspaces",
        "Coding vs chat",
        "Longest streak",
        "Peak weekday",
        "Multi-turn sessions",
        "Avg session duration",
      ],
    );
    assert.deepEqual(
      rows.map((r) => r.value),
      // 3 coding / (3+1) active → 75%; Mar 9–10 streak; 2 of 3 prompted sessions multi-turn.
      ["3", "Mar 9 · 10 prompts", "7", "75% coding", "2 days", "Monday", "67%", "18 min"],
    );
  });

  it("uses dashes for empty data and falls back busiest day", () => {
    const rows = buildActivityInsights({
      days: [{ date: "2026-03-08", skills: 3, mcp: 1, agents: 2, messages: 0, total: 4 }],
      summary: { skills: 3, mcp: 1, agents: 2, messages: 0, codingAgents: 0, chatAgents: 0 },
      workspaces: 0,
      locale: "en",
    });
    const value = (label: string) => rows.find((r) => r.label === label)?.value;
    assert.equal(value("Busiest day"), "Mar 8 · 4 calls");
    assert.equal(value("Peak weekday"), "Sunday");
    assert.equal(value("Longest streak"), "1 day");
    assert.equal(value("Multi-turn sessions"), "—");
    assert.equal(value("Avg session duration"), "—");
    assert.equal(value("Coding vs chat"), "—");
    assert.equal(value("Workspaces"), "0");

    const empty = buildActivityInsights({
      days: [],
      summary: { skills: 0, mcp: 0, agents: 0, messages: 0 },
      workspaces: 0,
      averageSessionMs: null,
      locale: "en",
    });
    assert.deepEqual(
      empty.map((r) => r.value),
      ["0", "—", "0", "—", "—", "—", "—", "—"],
    );
  });
});

describe("buildActivityKpi", () => {
  const codex = provider({
    provider: "codex",
    label: "Codex",
    messageCount: 12,
    models: [
      { model: "gpt-5.4", count: 9 },
      { model: "gpt-5.4-mini", count: 3 },
    ],
  });
  const claude = provider({
    provider: "claude",
    label: "Claude",
    messageCount: 4,
    models: [{ model: "opus", count: 4 }],
  });
  it("shows sessions, prompts and shares (069 / 070 / 072)", () => {
    const rows = buildActivityKpi({
      sessions: 12345,
      messages: 1605,
      locale: "en",
      providers: [codex, claude],
      allProviders: [codex, claude],
      providerFilter: "all",
    });
    assert.deepEqual(
      rows.map((r) => r.label),
      ["Sessions", "Prompts", "Top provider", "Top model"],
    );
    assert.equal(rows[0]?.value, "12,345");
    assert.equal(rows[1]?.value, "1,605");
    assert.equal(rows[2]?.value, "Codex · 75%");
    // gpt-5.4 9 of 16 model messages → 56%
    assert.equal(rows[3]?.value, "Gpt 5.4 · 56%");
    assert.equal(rows.length, 4);
  });

  it("scopes shares to the selected provider", () => {
    const rows = buildActivityKpi({
      sessions: 0,
      messages: 4,
      locale: "en",
      providers: [claude],
      allProviders: [codex, claude],
      providerFilter: "claude",
    });
    assert.equal(rows[2]?.value, "Claude · 25%");
    assert.equal(rows[3]?.value, "Opus · 100%");
  });

  it("tolerates missing data", () => {
    const empty = buildActivityKpi({
      sessions: 0,
      messages: 0,
      locale: "en",
      providers: [],
      allProviders: [],
      providerFilter: "all",
    });
    assert.equal(empty[0]?.value, "0");
    assert.equal(empty[2]?.value, "—");
    assert.equal(empty[3]?.value, "—");
  });
});
