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
