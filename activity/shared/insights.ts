import type { ActivityDay, ProviderUsageItem } from "./usage.ts";
import { computeStreaks, isActiveDay } from "./activity.ts";
import { formatCount, formatDisplayName, formatDuration } from "./format.ts";
import { messagesFor } from "./i18n.ts";

export type InsightRow = { label: string; value: string };
export type KpiComparison = { text: string; direction: "up" | "down" | "flat" | "unknown" };
export type KpiRow = InsightRow & { comparison?: KpiComparison };

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
function topProviderStats(
  providers: readonly ProviderUsageItem[],
  allProviders: readonly ProviderUsageItem[],
  providerFilter: string,
): { value: string; label: string | undefined } {
  const total = allProviders.reduce((sum, p) => sum + p.messageCount, 0);
  if (providerFilter !== "all") {
    const selected = providers.find((p) => p.provider === providerFilter);
    return { value: withShare(selected?.label, selected?.messageCount ?? 0, total), label: selected && selected.messageCount > 0 ? selected.label : undefined };
  }
  const ranked = [...providers]
    .filter((p) => p.messageCount > 0)
    .sort(
      (a, b) =>
        b.messageCount - a.messageCount || a.provider.localeCompare(b.provider),
  );
  const top = ranked[0];
  return { value: withShare(top?.label, top?.messageCount ?? 0, total), label: top?.label };
}

/** Messages-weighted top model (050) with its share of in-filter model messages (069). */
function topModelStats(
  providers: readonly ProviderUsageItem[],
  providerFilter: string,
): { value: string; label: string | undefined } {
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
  if (!top || top[1] <= 0) return { value: "—", label: undefined };
  const total = ranked.reduce((sum, [, count]) => sum + count, 0);
  const label = formatDisplayName(top[0]);
  return { value: withShare(label, top[1], total), label };
}

function comparison(current: number, previous: number, locale: string): KpiComparison {
  const suffix = messagesFor(locale).kpi.previous7Days;
  if (previous === 0 && current > 0) return { text: `— ${suffix}`, direction: "unknown" };
  const change = previous === 0 ? 0 : Math.round(((current - previous) / previous) * 100);
  const direction = change > 0 ? "up" : change < 0 ? "down" : "flat";
  const arrow = direction === "up" ? "↑" : direction === "down" ? "↓" : "→";
  return { text: `${arrow}${Math.abs(change).toLocaleString(locale)}% ${suffix}`, direction };
}

function previousLeader(label: string | undefined, locale: string): KpiComparison {
  return { text: `${label ?? "—"} ${messagesFor(locale).kpi.previous7DaysBare}`, direction: "unknown" };
}

/** Share of active agents that are coding (018); empty creations excluded. */
function codingVsChatValue(codingAgents: number, chatAgents: number, locale: string): string {
  const total = codingAgents + chatAgents;
  if (total <= 0) return "—";
  const pct = Math.round((codingAgents / total) * 100);
  return messagesFor(locale).insights.codingShare(pct);
}

/** Weekday with the highest activity volume among active days (full name, 072). */
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
  // 2026-03-08 was a Sunday — use a known Sunday + offset for the locale name.
  const probe = new Date(2026, 2, 8 + bestDow);
  return probe.toLocaleDateString(locale, { weekday: "long" });
}

/** Share of prompted sessions with ≥2 prompts (072); empty creations excluded. */
function multiTurnValue(
  multiTurn: { multiTurnSessions: number; promptedSessions: number } | null,
): string {
  if (!multiTurn || multiTurn.promptedSessions <= 0) return "—";
  return `${Math.round((multiTurn.multiTurnSessions / multiTurn.promptedSessions) * 100)}%`;
}

/**
 * Fixed 8-row insights (072 / 080): habit (active days, busiest day, streak,
 * peak weekday, workspaces, coding share) → session shape (multi-turn share,
 * engaged time).
 */
export function buildActivityInsights(input: {
  days: readonly ActivityDay[];
  summary: InsightSummary;
  /** Distinct workspaces among sessions (011). */
  workspaces: number;
  /** Mean engaged time per session from `usage.agent-lifetime` (072). */
  averageSessionMs?: number | null;
  /** Sessions with ≥2 / ≥1 prompts from `usage.agent-lifetime` (072). */
  multiTurn?: { multiTurnSessions: number; promptedSessions: number } | null;
  locale?: string;
  today?: Date;
}): InsightRow[] {
  const locale = input.locale ?? "en";
  const busiest = pickBusiestDay(input.days);
  const activeDays = input.days.filter(isActiveDay).length;
  const { longest } = computeStreaks(input.days, input.today);
  const codingAgents = input.summary.codingAgents ?? 0;
  const chatAgents = input.summary.chatAgents ?? 0;
  const { insights: m, units } = messagesFor(locale);
  const averageSessionMs = input.averageSessionMs;

  return [
    { label: m.activeDays, value: activeDays.toLocaleString(locale) },
    {
      label: m.busiestDay,
      value: busiest ? formatBusiest(busiest, locale) : "—",
    },
    { label: m.longestStreak, value: longest > 0 ? units.days(longest) : "—" },
    { label: m.peakWeekday, value: peakWeekdayValue(input.days, locale) },
    { label: m.workspaces, value: formatCount(input.workspaces) },
    {
      label: m.codingVsChat,
      value: codingVsChatValue(codingAgents, chatAgents, locale),
    },
    { label: m.multiTurnSessions, value: multiTurnValue(input.multiTurn ?? null) },
    {
      label: m.avgSessionDuration,
      value: averageSessionMs == null ? "—" : formatDuration(averageSessionMs, locale),
    },
  ];
}

/**
 * Fixed 4-tile KPI row (069 / 070 / 072): sessions, prompts, top provider ·
 * share, top model · share. Active days lives in Insights.
 */
export function buildActivityKpi(input: {
  sessions: number;
  messages: number;
  locale?: string;
  /** Provider rows after the provider filter. */
  providers: readonly ProviderUsageItem[];
  /** Every provider; denominator of the top-provider share. */
  allProviders: readonly ProviderUsageItem[];
  providerFilter: string;
  /** Two adjacent seven-day windows, when the comparison query has loaded. */
  comparison?: {
    current: readonly ProviderUsageItem[];
    previous: readonly ProviderUsageItem[];
  };
}): KpiRow[] {
  const locale = input.locale ?? "en";
  const m = messagesFor(locale).kpi;
  const topProvider = topProviderStats(input.providers, input.allProviders, input.providerFilter);
  const topModel = topModelStats(input.providers, input.providerFilter);
  const current = input.comparison?.current ?? [];
  const previous = input.comparison?.previous ?? [];
  const previousProvider = topProviderStats(previous, previous, input.providerFilter);
  const previousModel = topModelStats(previous, input.providerFilter);
  const count = (items: readonly ProviderUsageItem[], field: "agentCount" | "messageCount") =>
    items.reduce(
      (sum, item) => sum + (input.providerFilter === "all" || item.provider === input.providerFilter ? item[field] : 0),
      0,
    );
  const trend = input.comparison;
  return [
    {
      label: m.sessions,
      value: input.sessions.toLocaleString(locale),
      comparison: trend ? comparison(count(current, "agentCount"), count(previous, "agentCount"), locale) : undefined,
    },
    {
      label: m.prompts,
      value: input.messages.toLocaleString(locale),
      comparison: trend ? comparison(count(current, "messageCount"), count(previous, "messageCount"), locale) : undefined,
    },
    {
      label: m.topProvider,
      value: topProvider.value,
      comparison: trend ? previousLeader(previousProvider.label, locale) : undefined,
    },
    {
      label: m.topModel,
      value: topModel.value,
      comparison: trend ? previousLeader(previousModel.label, locale) : undefined,
    },
  ];
}
