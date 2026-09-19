import type { ActivityDay, ProviderUsageItem } from "./usage.ts";
import { isActiveDay } from "./activity.ts";
import { formatDisplayName } from "./format.ts";

export type InsightRow = { label: string; value: string };

export type InsightSummary = {
  skills: number;
  mcp: number;
  agents: number;
  messages: number;
  shell?: number;
  fileReads?: number;
  fileWrites?: number;
  longestStreak?: number;
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
  if (day.messages > 0) return `${label} · ${day.messages} messages`;
  const calls = day.skills + day.mcp;
  if (calls > 0) return `${label} · ${calls} calls`;
  if (day.agents > 0) return `${label} · ${day.agents} agents`;
  return label;
}

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
  const pct = total > 0 ? Math.round((top[1] / total) * 100) : 0;
  return `${formatDisplayName(top[0])} · ${pct}%`;
}

/** coding = shell + file ops; share of coding among coding+messages. */
function codingVsChatValue(shell: number, fileOps: number, messages: number): string {
  const coding = shell + fileOps;
  const total = coding + messages;
  if (total <= 0) return "—";
  const pct = Math.round((coding / total) * 100);
  return `${pct}% coding`;
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
 * Fixed 8-row habit insights. Avoids KPI totals and Most used entity lists.
 */
export function buildActivityInsights(input: {
  days: readonly ActivityDay[];
  summary: InsightSummary;
  providers: readonly ProviderUsageItem[];
  providerFilter: string;
  locale?: string;
  /** Max rows (default {@link ACTIVITY_LIST_LIMIT}). */
  limit?: number;
}): InsightRow[] {
  const locale = input.locale ?? "en";
  const limit = input.limit ?? ACTIVITY_LIST_LIMIT;
  const activeDays = input.days.filter(isActiveDay).length;
  const busiest = pickBusiestDay(input.days);
  const shell = input.summary.shell ?? 0;
  const fileOps = (input.summary.fileReads ?? 0) + (input.summary.fileWrites ?? 0);
  const longest = input.summary.longestStreak;

  const rows: InsightRow[] = [
    { label: "Active days", value: String(activeDays) },
    {
      label: "Longest streak",
      value:
        longest != null
          ? `${longest} day${longest === 1 ? "" : "s"}`
          : "—",
    },
    {
      label: "Busiest day",
      value: busiest ? formatBusiest(busiest, locale) : "—",
    },
    {
      label: "Top model",
      value: topModelValue(input.providers, input.providerFilter),
    },
    {
      label: "Messages per agent",
      value: formatRatio(input.summary.messages, input.summary.agents),
    },
    {
      label: "Tools per message",
      value: formatRatio(input.summary.skills + input.summary.mcp, input.summary.messages),
    },
    {
      label: "Coding vs chat",
      value: codingVsChatValue(shell, fileOps, input.summary.messages),
    },
    {
      label: "Peak weekday",
      value: peakWeekdayValue(input.days, locale),
    },
  ];

  return rows.slice(0, limit);
}
