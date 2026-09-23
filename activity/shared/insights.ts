import type { ActivityDay, ProviderUsageItem } from "./usage.ts";
import { isActiveDay } from "./activity.ts";
import { formatCount, formatDisplayName, formatDuration } from "./format.ts";
import { messagesFor } from "./i18n.ts";

export type InsightRow = { label: string; value: string };

export type InsightSummary = {
  skills: number;
  mcp: number;
  agents: number;
  messages: number;
  /** Agents with ≥1 coding op in-window (019: file write or mutating shell). */
  codingAgents?: number;
  /** Active non-coding agents (018); empty creations excluded. */
  chatAgents?: number;
};

/** Shared cap for Activity insights and Most used skills / MCP / models. */
export const ACTIVITY_LIST_LIMIT = 8;

function formatRatio(numerator: number, denominator: number): string {
  if (denominator <= 0) return "—";
  const value = numerator / denominator;
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1).replace(/\.0$/, "");
}

function formatDayLabel(dateKey: string, locale: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  return new Date(y, m - 1, d).toLocaleDateString(locale, { month: "short", day: "numeric" });
}

function parseLocalDate(dateKey: string): Date | null {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function activityVolume(day: ActivityDay): number {
  return day.messages + day.agents + day.skills + day.mcp;
}

function pickBusiestDay(days: readonly ActivityDay[]): ActivityDay | null {
  let best: ActivityDay | null = null;
  let bestMessages = -1;
  for (const day of days) {
    if (day.messages > bestMessages) {
      best = day;
      bestMessages = day.messages;
    }
  }
  if (best && best.messages > 0) return best;

  let bestVolume = -1;
  best = null;
  for (const day of days) {
    const volume = activityVolume(day);
    if (volume > bestVolume) {
      best = day;
      bestVolume = volume;
    }
  }
  return bestVolume > 0 ? best : null;
}

function formatBusiest(day: ActivityDay, locale: string): string {
  const label = formatDayLabel(day.date, locale);
  const { units } = messagesFor(locale);
  if (day.messages > 0) return `${label} · ${units.messages(day.messages)}`;
  const calls = day.skills + day.mcp;
  if (calls > 0) return `${label} · ${units.calls(calls)}`;
  if (day.agents > 0) return `${label} · ${units.agents(day.agents)}`;
  return label;
}

/** Messages-weighted top provider (050); label only — no share (052 follow-up). */
function topProviderValue(
  providers: readonly ProviderUsageItem[],
  providerFilter: string,
): string {
  if (providerFilter !== "all") {
    return providers.find((p) => p.provider === providerFilter)?.label ?? "—";
  }
  const ranked = [...providers]
    .filter((p) => p.messageCount > 0)
    .sort(
      (a, b) =>
        b.messageCount - a.messageCount || a.provider.localeCompare(b.provider),
    );
  return ranked[0]?.label ?? "—";
}

/** Messages-weighted top model (050); label only — no share (052 follow-up). */
function topModelValue(
  providers: readonly ProviderUsageItem[],
  providerFilter: string,
): string {
  const map = new Map<string, number>();
  const source =
    providerFilter === "all"
      ? providers
      : providers.filter((p) => p.provider === providerFilter);
  for (const item of source) {
    for (const model of item.models) {
      map.set(model.model, (map.get(model.model) ?? 0) + model.count);
    }
  }
  const ranked = [...map.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  const top = ranked[0];
  if (!top || top[1] <= 0) return "—";
  return formatDisplayName(top[0]);
}

/** Share of active agents that are coding (018); empty creations excluded. */
function codingVsChatValue(codingAgents: number, chatAgents: number, locale: string): string {
  const total = codingAgents + chatAgents;
  if (total <= 0) return "—";
  const pct = Math.round((codingAgents / total) * 100);
  return messagesFor(locale).insights.codingShare(pct);
}

/** Weekday with the highest activity volume among active days. */
function peakWeekdayValue(days: readonly ActivityDay[], locale: string): string {
  const volumes = [0, 0, 0, 0, 0, 0, 0];
  for (const day of days) {
    if (!isActiveDay(day)) continue;
    const date = parseLocalDate(day.date);
    if (!date) continue;
    volumes[date.getDay()] += activityVolume(day);
  }
  let bestDow = -1;
  let bestVol = 0;
  for (let dow = 0; dow < 7; dow++) {
    if (volumes[dow]! > bestVol) {
      bestVol = volumes[dow]!;
      bestDow = dow;
    }
  }
  if (bestDow < 0 || bestVol <= 0) return "—";
  // 2026-03-08 was a Sunday — use a known Sunday + offset for locale short name.
  const probe = new Date(2026, 2, 8 + bestDow);
  return probe.toLocaleDateString(locale, { weekday: "short" });
}

/**
 * Fixed 8-row insights: calendar habit → in-window volume → structure (050;
 * Workspaces moved in from the KPI row in 054).
 */
export function buildActivityInsights(input: {
  days: readonly ActivityDay[];
  summary: InsightSummary;
  /** Distinct workspaces among in-window agents (011); was KPI tile 3 before 054. */
  workspaces: number;
  locale?: string;
}): InsightRow[] {
  const locale = input.locale ?? "en";
  const activeDays = input.days.filter(isActiveDay).length;
  const busiest = pickBusiestDay(input.days);
  const codingAgents = input.summary.codingAgents ?? 0;
  const chatAgents = input.summary.chatAgents ?? 0;
  const m = messagesFor(locale).insights;

  return [
    { label: m.activeDays, value: String(activeDays) },
    {
      label: m.busiestDay,
      value: busiest ? formatBusiest(busiest, locale) : "—",
    },
    { label: m.workspaces, value: formatCount(input.workspaces) },
    { label: m.messages, value: input.summary.messages.toLocaleString(locale) },
    { label: m.skillCalls, value: input.summary.skills.toLocaleString(locale) },
    { label: m.mcpCalls, value: input.summary.mcp.toLocaleString(locale) },
    {
      label: m.messagesPerAgent,
      value: formatRatio(input.summary.messages, input.summary.agents),
    },
    {
      label: m.codingVsChat,
      value: codingVsChatValue(codingAgents, chatAgents, locale),
    },
  ];
}

/**
 * Fixed 6-tile KPI row (050): agents, longest agent, top provider, top model,
 * peak weekday (054), longest streak.
 */
export function buildActivityKpi(input: {
  agents: number;
  /** Active days drive the peak-weekday tile (054); was an insights row before. */
  days: readonly ActivityDay[];
  locale?: string;
  longestStreak: number;
  /** Longest created→(archived | now) span from the registry (049 / 051). */
  longestAgent: { durationMs: number; active: boolean } | null;
  providers: readonly ProviderUsageItem[];
  providerFilter: string;
}): InsightRow[] {
  const streak = input.longestStreak;
  const longest = input.longestAgent;
  const locale = input.locale ?? "en";
  const messages = messagesFor(locale);
  const m = messages.kpi;
  return [
    { label: m.agents, value: formatCount(input.agents) },
    {
      label: m.longestAgent,
      value: longest
        ? `${formatDuration(longest.durationMs, locale)}${longest.active ? ` · ${m.stillActive}` : ""}`
        : "—",
    },
    {
      label: m.topProvider,
      value: topProviderValue(input.providers, input.providerFilter),
    },
    {
      label: m.topModel,
      value: topModelValue(input.providers, input.providerFilter),
    },
    { label: m.peakWeekday, value: peakWeekdayValue(input.days, locale) },
    { label: m.longestStreak, value: messages.units.days(streak) },
  ];
}
