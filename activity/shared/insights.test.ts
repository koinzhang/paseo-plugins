import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ACTIVITY_LIST_LIMIT, buildActivityInsights } from "./insights.ts";
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
    workspaceCount: 0,
    messageCount: 0,
    callCount: 0,
    ...partial,
  };
}

describe("buildActivityInsights", () => {
  it("returns habit-first 8 rows with Top model on All", () => {
    // 2026-03-07 Sat, 2026-03-09 Mon — Mon has more messages → Peak weekday Mon
    const days = [
      { date: "2026-03-07", skills: 2, mcp: 0, agents: 1, messages: 4, total: 2 },
      { date: "2026-03-09", skills: 0, mcp: 0, agents: 0, messages: 10, total: 0 },
    ];
    const rows = buildActivityInsights({
      days,
      summary: {
        skills: 2,
        mcp: 3,
        agents: 2,
        messages: 14,
        shell: 10,
        fileReads: 3,
        fileWrites: 2,
        longestStreak: 6,
      },
      providers: [
        provider({
          provider: "codex",
          label: "Codex",
          messageCount: 10,
          models: [{ model: "gpt-5.4", count: 10 }],
        }),
        provider({
          provider: "claude",
          label: "Claude",
          messageCount: 4,
          models: [{ model: "opus", count: 4 }],
        }),
      ],
      providerFilter: "all",
      locale: "en",
    });

    assert.equal(rows.length, ACTIVITY_LIST_LIMIT);
    assert.deepEqual(
      rows.map((r) => r.label),
      [
        "Active days",
        "Longest streak",
        "Busiest day",
        "Top model",
        "Messages per agent",
        "Tools per message",
        "Coding vs chat",
        "Peak weekday",
      ],
    );
    assert.equal(rows[0]?.value, "2");
    assert.equal(rows[1]?.value, "6 days");
    assert.equal(rows[2]?.value, "Mar 9 · 10 messages");
    assert.equal(rows[3]?.value, "Gpt 5.4 · 71%");
    assert.equal(rows[4]?.value, "7");
    assert.equal(rows[5]?.value, "0.4");
    // coding=15, messages=14 → 15/29 ≈ 52%
    assert.equal(rows[6]?.value, "52% coding");
    assert.equal(rows[7]?.value, "Mon");
  });

  it("shows Top model for a provider filter from that provider's models", () => {
    const rows = buildActivityInsights({
      days: [{ date: "2026-03-07", skills: 0, mcp: 0, agents: 0, messages: 10, total: 0 }],
      summary: { skills: 0, mcp: 0, agents: 0, messages: 10, longestStreak: 1 },
      providers: [
        provider({
          provider: "codex",
          label: "Codex",
          messageCount: 10,
          models: [{ model: "gpt-5.4", count: 10 }],
        }),
      ],
      providerFilter: "codex",
    });
    assert.equal(rows.length, ACTIVITY_LIST_LIMIT);
    assert.equal(rows.find((r) => r.label === "Top model")?.value, "Gpt 5.4 · 100%");
  });

  it("uses dashes for zero denominators and falls back busiest day", () => {
    const rows = buildActivityInsights({
      days: [{ date: "2026-03-08", skills: 3, mcp: 1, agents: 2, messages: 0, total: 4 }],
      summary: { skills: 3, mcp: 1, agents: 0, messages: 0, shell: 0, fileReads: 0, fileWrites: 0 },
      providers: [],
      providerFilter: "all",
      locale: "en",
    });
    assert.equal(rows.find((r) => r.label === "Busiest day")?.value, "Mar 8 · 4 calls");
    assert.equal(rows.find((r) => r.label === "Messages per agent")?.value, "—");
    assert.equal(rows.find((r) => r.label === "Tools per message")?.value, "—");
    assert.equal(rows.find((r) => r.label === "Coding vs chat")?.value, "—");
    assert.equal(rows.find((r) => r.label === "Top model")?.value, "—");
    assert.equal(rows.find((r) => r.label === "Peak weekday")?.value, "Sun");
  });
});
