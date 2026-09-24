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
  if (day.messages > 0) return `${label} · ${units.prompts(day.messages)}`;
  const calls = day.skills + day.mcp;
  if (calls > 0) return `${label} · ${units.calls(calls)}`;
  if (day.agents > 0) return `${label} · ${units.sessions(day.agents)}`;
  return label;
}

/** `label · pct%`; `—` when there is no label or no denominator (069). */
function withShare(label: string | undefined, count: number, total: number): string {
  if (!label || total <= 0) return "—";
  return `${label} · ${Math.round((count / total) * 100)}%`;
}

/**
 * Messages-weighted top provider (050) with its share of all providers' messages
 * (069). A selected provider is shown with its own share.
 */
function topProviderValue(
  providers: readonly ProviderUsageItem[],
  allProviders: readonly ProviderUsageItem[],
  providerFilter: string,
): string {
  const total = allProviders.reduce((sum, p) => sum + p.messageCount, 0);
  if (providerFilter !== "all") {
    const selected = providers.find((p) => p.provider === providerFilter);
    return withShare(selected?.label, selected?.messageCount ?? 0, total);
  }
  const ranked = [...providers]
    .filter((p) => p.messageCount > 0)
    .sort(
      (a, b) =>
        b.messageCount - a.messageCount || a.provider.localeCompare(b.provider),
    );
  const top = ranked[0];
  return withShare(top?.label, top?.messageCount ?? 0, total);
}

/** Messages-weighted top model (050) with its share of in-filter model messages (069). */
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
  const total = ranked.reduce((sum, [, count]) => sum + count, 0);
  return withShare(formatDisplayName(top[0]), top[1], total);
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

type LongestSession = { durationMs: number; active: boolean } | null;

function longestSessionValue(longest: LongestSession, locale: string): string {
  if (!longest) return "—";
  const m = messagesFor(locale).insights;
  return `${formatDuration(longest.durationMs, locale)}${longest.active ? ` · ${m.stillActive}` : ""}`;
}

/**
 * Fixed 8-row insights: calendar habit → volume → structure (050 / 054). 069
 * moved Active days / Messages up to the KPI row and Peak weekday / Longest
 * session down from it.
 */
export function buildActivityInsights(input: {
  days: readonly ActivityDay[];
  summary: InsightSummary;
  /** Distinct workspaces among sessions (011). */
  workspaces: number;
  /** Longest created→(archived | now) span from the registry (049 / 051). */
  longestSession?: LongestSession;
  locale?: string;
}): InsightRow[] {
  const locale = input.locale ?? "en";
  const busiest = pickBusiestDay(input.days);
  const codingAgents = input.summary.codingAgents ?? 0;
  const chatAgents = input.summary.chatAgents ?? 0;
  const m = messagesFor(locale).insights;

  return [
    {
      label: m.busiestDay,
      value: busiest ? formatBusiest(busiest, locale) : "—",
    },
    { label: m.peakWeekday, value: peakWeekdayValue(input.days, locale) },
    { label: m.workspaces, value: formatCount(input.workspaces) },
    { label: m.skillCalls, value: input.summary.skills.toLocaleString(locale) },
    { label: m.mcpCalls, value: input.summary.mcp.toLocaleString(locale) },
    {
      label: m.promptsPerSession,
      value: formatRatio(input.summary.messages, input.summary.agents),
    },
    { label: m.longestSession, value: longestSessionValue(input.longestSession ?? null, locale) },
    {
      label: m.codingVsChat,
      value: codingVsChatValue(codingAgents, chatAgents, locale),
    },
  ];
}

/**
 * Fixed 5-tile KPI row (069 / 070): sessions, prompts, top provider · share,
 * top model · share, active days.
 */
export function buildActivityKpi(input: {
  sessions: number;
  messages: number;
  days: readonly ActivityDay[];
  locale?: string;
  /** Provider rows after the provider filter. */
  providers: readonly ProviderUsageItem[];
  /** Every provider; denominator of the top-provider share. */
  allProviders: readonly ProviderUsageItem[];
  providerFilter: string;
}): InsightRow[] {
  const locale = input.locale ?? "en";
  const m = messagesFor(locale).kpi;
  return [
    { label: m.sessions, value: input.sessions.toLocaleString(locale) },
    { label: m.prompts, value: input.messages.toLocaleString(locale) },
    {
      label: m.topProvider,
      value: topProviderValue(input.providers, input.allProviders, input.providerFilter),
    },
    {
      label: m.topModel,
      value: topModelValue(input.providers, input.providerFilter),
    },
    { label: m.activeDays, value: input.days.filter(isActiveDay).length.toLocaleString(locale) },
  ];
}
