export type RangeId = "all" | "7d" | "30d" | "today";

export const RANGE_OPTIONS: ReadonlyArray<{ id: RangeId; label: string }> = [
  { id: "all", label: "All time" },
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
];

/** Inclusive lower bound ISO timestamp for a range chip; undefined = all time. */
export function rangeFrom(id: RangeId): string | undefined {
  if (id === "all") return undefined;
  if (id === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }
  const days = id === "7d" ? 7 : 30;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Local-midnight start of a fixed `days`-day window ending today (050).
 * `days = 30` yields exactly 30 local-day buckets including today; the window
 * does not follow the range chips.
 */
export function fixedWindowFrom(days: number, now: Date = new Date()): string {
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - (Math.max(1, Math.floor(days)) - 1),
  );
  return start.toISOString();
}
