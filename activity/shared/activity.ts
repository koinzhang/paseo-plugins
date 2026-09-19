import type { ActivityDay } from "./usage.ts";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function toDayKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Sunday-start week containing `date`. */
function startOfWeekSunday(date: Date): Date {
  const d = startOfLocalDay(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export type HeatmapMode = "daily" | "weekly" | "cumulative";

export function buildActivityCalendar(days: readonly ActivityDay[], mode: HeatmapMode, from?: string, today = new Date(), locale = "en") {
  const end = startOfLocalDay(today);
  let first: Date;
  let start: Date;
  if (from) {
    const parsed = startOfLocalDay(new Date(from));
    first = Number.isNaN(parsed.getTime()) ? addDays(end, -363) : parsed;
    start = startOfWeekSunday(first);
  } else {
    // Fixed 52-week year window (ChatGPT-style): current week + 51 prior weeks.
    start = addDays(startOfWeekSunday(end), -7 * 51);
    first = start;
  }
  const daily = new Map(days.map(day => [day.date, day]));
  const weekly = new Map<string, ActivityDay>();
  for (const day of days) {
    const key = toDayKey(startOfWeekSunday(parseDayKey(day.date)));
    const prev = weekly.get(key) ?? { date: key, skills: 0, mcp: 0, agents: 0, messages: 0, total: 0 };
    weekly.set(key, {
      date: key,
      skills: prev.skills + day.skills,
      mcp: prev.mcp + day.mcp,
      agents: prev.agents + day.agents,
      messages: prev.messages + day.messages,
      total: 0,
    });
  }
  for (const [key, day] of weekly) {
    weekly.set(key, {
      ...day,
      total: day.skills + day.mcp + day.agents + day.messages,
    });
  }
  let skills = 0;
  let mcp = 0;
  let agents = 0;
  let messages = 0;
  // Carry history before the displayed year into the cumulative view.
  for (const day of days) {
    if (day.date < toDayKey(start)) {
      skills += day.skills;
      mcp += day.mcp;
      agents += day.agents;
      messages += day.messages;
    }
  }
  const weeks = [];
  let max = 0;
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 7)) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(cursor, d);
      const key = toDayKey(date);
      const future = date > end;
      const excluded = date < first;
      const raw = daily.get(key);
      skills += raw?.skills ?? 0;
      mcp += raw?.mcp ?? 0;
      agents += raw?.agents ?? 0;
      messages += raw?.messages ?? 0;
      const value =
        mode === "weekly"
          ? weekly.get(toDayKey(cursor))
          : mode === "cumulative"
            ? { skills, mcp, agents, messages, total: skills + mcp + agents + messages }
            : raw;
      const skillsN = value?.skills ?? 0;
      const mcpN = value?.mcp ?? 0;
      const agentsN = value?.agents ?? 0;
      const messagesN = value?.messages ?? 0;
      const cell = {
        key,
        future,
        excluded,
        skills: skillsN,
        mcp: mcpN,
        agents: agentsN,
        messages: messagesN,
        total: skillsN + mcpN + agentsN + messagesN,
      };
      if (!future && !excluded) max = Math.max(max, cell.total);
      week.push(cell);
    }
    weeks.push(week);
  }
  // Month axis: at most 12 labels, first/last flush to sides, evenly spaced (ChatGPT-style).
  // Year windows use the trailing 12 months ending at `end` (e.g. Oct…Sep).
  const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  const spanMonths =
    (endMonth.getFullYear() - startMonth.getFullYear()) * 12 +
    (endMonth.getMonth() - startMonth.getMonth()) +
    1;
  const monthCount = Math.min(12, Math.max(1, spanMonths));
  const months: Array<{ index: number; label: string }> = [];
  for (let i = 0; i < monthCount; i++) {
    const date =
      monthCount === 12
        ? new Date(end.getFullYear(), end.getMonth() - (monthCount - 1 - i), 1)
        : new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1);
    months.push({
      index: (i / monthCount) * weeks.length,
      label: date.toLocaleDateString(locale, { month: "short" }),
    });
  }
  return { weeks, months, max };
}

export function activityLevel(total: number, max: number): number {
  if (total <= 0 || max <= 0) return 0;
  return Math.max(1, Math.min(4, Math.ceil(Math.sqrt(total / max) * 4)));
}

/** Day counts as active if any tracked dimension fired (tools, agents, or messages). */
export function isActiveDay(day: Pick<ActivityDay, "skills" | "mcp" | "agents" | "messages">): boolean {
  return day.skills > 0 || day.mcp > 0 || day.agents > 0 || day.messages > 0;
}

/** Current streak ending today (or yesterday), and longest streak in the series. */
export function computeStreaks(
  days: readonly ActivityDay[],
  today = new Date(),
): { current: number; longest: number } {
  const active = new Set(days.filter(isActiveDay).map((d) => d.date));
  if (active.size === 0) return { current: 0, longest: 0 };

  const end = startOfLocalDay(today);
  let longest = 0;
  let run = 0;
  const sorted = [...active].sort();
  let prev: string | null = null;
  for (const key of sorted) {
    if (prev && toDayKey(addDays(parseDayKey(prev), 1)) === key) run += 1;
    else run = 1;
    if (run > longest) longest = run;
    prev = key;
  }

  let current = 0;
  let cursor = end;
  // Allow streak to still count if last active day was yesterday.
  if (!active.has(toDayKey(cursor))) {
    cursor = addDays(cursor, -1);
  }
  while (active.has(toDayKey(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  return { current, longest };
}
