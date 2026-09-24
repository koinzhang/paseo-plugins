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

  it("returns calendar → volume → structure 8 rows (069)", () => {
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
      longestSession: { durationMs: 277.7 * 3_600_000, active: false },
      locale: "en",
    });

    assert.equal(rows.length, ACTIVITY_LIST_LIMIT);
    assert.deepEqual(
      rows.map((r) => r.label),
      [
        "Busiest day",
        "Peak weekday",
        "Workspaces",
        "Skill calls",
        "MCP calls",
        "Prompts per session",
        "Longest session",
        "Coding vs chat",
      ],
    );
    assert.equal(rows[0]?.value, "Mar 9 · 10 prompts");
    assert.equal(rows[1]?.value, "Mon");
    assert.equal(rows[2]?.value, "7");
    assert.equal(rows[3]?.value, "2");
    assert.equal(rows[4]?.value, "3");
    assert.equal(rows[5]?.value, "2.8");
    assert.equal(rows[6]?.value, "11.6 days");
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
    assert.equal(rows.find((r) => r.label === "Peak weekday")?.value, "Sun");
    assert.equal(rows.find((r) => r.label === "Prompts per session")?.value, "0");
    assert.equal(rows.find((r) => r.label === "Longest session")?.value, "—");
    assert.equal(rows.find((r) => r.label === "Coding vs chat")?.value, "—");
    assert.equal(rows.find((r) => r.label === "Workspaces")?.value, "0");
  });

  it("marks the longest session as active while it is still open (051)", () => {
    const rows = buildActivityInsights({
      days: [],
      summary: { skills: 12345, mcp: 0, agents: 1, messages: 0 },
      workspaces: 0,
      longestSession: { durationMs: 26 * 3_600_000, active: true },
      locale: "en",
    });
    assert.equal(rows.find((r) => r.label === "Longest session")?.value, "26 h · active");
    assert.equal(rows.find((r) => r.label === "Skill calls")?.value, "12,345");
    assert.equal(rows.find((r) => r.label === "Busiest day")?.value, "—");
    assert.equal(rows.find((r) => r.label === "Peak weekday")?.value, "—");
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
  const days = [
    { date: "2026-03-07", skills: 2, mcp: 0, agents: 1, messages: 4, total: 2 },
    { date: "2026-03-09", skills: 0, mcp: 0, agents: 0, messages: 10, total: 0 },
    { date: "2026-03-10", skills: 0, mcp: 0, agents: 0, messages: 0, total: 0 },
  ];

  it("shows sessions, prompts, shares and active days (069 / 070)", () => {
    const rows = buildActivityKpi({
      sessions: 12345,
      messages: 1605,
      days,
      locale: "en",
      providers: [codex, claude],
      allProviders: [codex, claude],
      providerFilter: "all",
    });
    assert.deepEqual(
      rows.map((r) => r.label),
      ["Sessions", "Prompts", "Top provider", "Top model", "Active days"],
    );
    assert.equal(rows[0]?.value, "12,345");
    assert.equal(rows[1]?.value, "1,605");
    assert.equal(rows[2]?.value, "Codex · 75%");
    // gpt-5.4 9 of 16 model messages → 56%
    assert.equal(rows[3]?.value, "Gpt 5.4 · 56%");
    assert.equal(rows[4]?.value, "2");
    assert.equal(rows.length, 5);
  });

  it("scopes shares to the selected provider", () => {
    const rows = buildActivityKpi({
      sessions: 0,
      messages: 4,
      days,
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
      days: [],
      locale: "en",
      providers: [],
      allProviders: [],
      providerFilter: "all",
    });
    assert.equal(empty[0]?.value, "0");
    assert.equal(empty[2]?.value, "—");
    assert.equal(empty[3]?.value, "—");
    assert.equal(empty[4]?.value, "0");
  });
});
