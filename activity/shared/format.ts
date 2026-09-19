/** Format stored ISO timestamps for UI / export in the local timezone + locale. */
export function formatLocalDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** Display-name prettifier: `-` / `_` → spaces, then Title Case each word. */
export function formatDisplayName(value: string): string {
  const cleaned = value.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return value;
  return cleaned.replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

/**
 * Compact 24-hour timestamp for list rows:
 * today → `HH:mm`; same year → `MM-DD HH:mm`; otherwise → `YYYY-MM-DD HH:mm`.
 */
export function formatDayTime(
  iso: string | null | undefined,
  now: Date = new Date(),
): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const time = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  if (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  ) {
    return time;
  }
  const monthDay = `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  if (date.getFullYear() === now.getFullYear()) return `${monthDay} ${time}`;
  return `${date.getFullYear()}-${monthDay} ${time}`;
}
