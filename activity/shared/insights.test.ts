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
  it("returns calendar → volume → structure 8 rows", () => {
    const days = [
      { date: "2026-03-07", skills: 2, mcp: 0, agents: 1, messages: 4, total: 2 },
      { date: "2026-03-09", skills: 0, mcp: 0, agents: 0, messages: 10, total: 0 },
    ];
    const rows = buildActivityInsights({
      days,
      summary: {
        skills: 2,
        mcp: 3,
        agents: 5,
        messages: 14,
        codingAgents: 3,
        chatAgents: 1,
      },
      workspaces: 7,
      locale: "en",
    });

    assert.equal(rows.length, ACTIVITY_LIST_LIMIT);
    assert.deepEqual(
      rows.map((r) => r.label),
      [
        "Active days",
        "Busiest day",
        "Workspaces",
        "Messages",
        "Skill calls",
        "MCP calls",
        "Messages per agent",
        "Coding vs chat",
      ],
    );
    assert.equal(rows[0]?.value, "2");
    assert.equal(rows[1]?.value, "Mar 9 · 10 messages");
    assert.equal(rows[2]?.value, "7");
    assert.equal(rows[3]?.value, "14");
    assert.equal(rows[4]?.value, "2");
    assert.equal(rows[5]?.value, "3");
    assert.equal(rows[6]?.value, "2.8");
    // 3 coding / (3+1) active → 75%
    assert.equal(rows[7]?.value, "75% coding");
  });

  it("uses dashes for zero denominators and falls back busiest day", () => {
    const rows = buildActivityInsights({
      days: [{ date: "2026-03-08", skills: 3, mcp: 1, agents: 2, messages: 0, total: 4 }],
      summary: { skills: 3, mcp: 1, agents: 2, messages: 0, codingAgents: 0, chatAgents: 0 },
      workspaces: 0,
      locale: "en",
    });
    assert.equal(rows.find((r) => r.label === "Busiest day")?.value, "Mar 8 · 4 calls");
    assert.equal(rows.find((r) => r.label === "Messages per agent")?.value, "0");
    assert.equal(rows.find((r) => r.label === "Coding vs chat")?.value, "—");
    assert.equal(rows.find((r) => r.label === "Workspaces")?.value, "0");
  });

  it("groups volume counts with the app locale", () => {
    const rows = buildActivityInsights({
      days: [],
      summary: { skills: 0, mcp: 0, agents: 1, messages: 12345 },
      workspaces: 0,
      locale: "en",
    });
    assert.equal(rows.find((r) => r.label === "Messages")?.value, "12,345");
    assert.equal(rows.find((r) => r.label === "Active days")?.value, "0");
    assert.equal(rows.find((r) => r.label === "Busiest day")?.value, "—");
  });
});

describe("buildActivityKpi", () => {
  const codex = provider({
    provider: "codex",
    label: "Codex",
    messageCount: 10,
    models: [{ model: "gpt-5.4", count: 10 }],
  });
  const claude = provider({
    provider: "claude",
    label: "Claude",
    messageCount: 4,
    models: [{ model: "opus", count: 4 }],
  });
  // 2026-03-07 Sat, 2026-03-09 Mon — Mon carries more messages → Peak weekday Mon.
  const days = [
    { date: "2026-03-07", skills: 2, mcp: 0, agents: 1, messages: 4, total: 2 },
    { date: "2026-03-09", skills: 0, mcp: 0, agents: 0, messages: 10, total: 0 },
  ];

  it("leads with top / longest tiles", () => {
    const rows = buildActivityKpi({
      agents: 12345,
      days,
      locale: "en",
      longestStreak: 6,
      longestAgent: { durationMs: 277.7 * 3_600_000, active: false },
      providers: [codex, claude],
      providerFilter: "all",
    });
    assert.deepEqual(
      rows.map((r) => r.label),
      ["Agents", "Longest agent", "Top provider", "Top model", "Peak weekday", "Longest streak"],
    );
    assert.equal(rows[0]?.value, "12.3k");
    assert.equal(rows[1]?.value, "11.6 days");
    assert.equal(rows[2]?.value, "Codex");
    assert.equal(rows[3]?.value, "Gpt 5.4");
    assert.equal(rows[4]?.value, "Mon");
    assert.equal(rows[5]?.value, "6 days");
  });

  it("marks the longest agent as active while it is still open (051)", () => {
    const rows = buildActivityKpi({
      agents: 3,
      days: [{ date: "2026-03-08", skills: 3, mcp: 1, agents: 2, messages: 0, total: 4 }],
      locale: "en",
      longestStreak: 2,
      longestAgent: { durationMs: 26 * 3_600_000, active: true },
      providers: [codex],
      providerFilter: "all",
    });
    assert.equal(rows[1]?.value, "26 h · active");
    assert.equal(rows[4]?.value, "Sun");
  });

  it("scopes top tiles to the selected provider and tolerates missing data", () => {
    const rows = buildActivityKpi({
      agents: 0,
      days,
      locale: "en",
      longestStreak: 1,
      longestAgent: null,
      providers: [codex],
      providerFilter: "codex",
    });
    assert.equal(rows[1]?.value, "—");
    assert.equal(rows[2]?.value, "Codex");
    assert.equal(rows[3]?.value, "Gpt 5.4");
    assert.equal(rows[4]?.value, "Mon");
    assert.equal(rows[5]?.value, "1 day");

    const empty = buildActivityKpi({
      agents: 0,
      days: [],
      locale: "en",
      longestStreak: 0,
      longestAgent: null,
      providers: [],
      providerFilter: "all",
    });
    assert.equal(empty[2]?.value, "—");
    assert.equal(empty[3]?.value, "—");
    assert.equal(empty[4]?.value, "—");
    assert.equal(empty[5]?.value, "0 days");
  });
});
