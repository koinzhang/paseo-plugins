/** Format stored ISO timestamps for UI / export in the local timezone + locale. */
export function formatLocalDateTime(
  iso: string | null | undefined,
  locale = "en",
): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Display-name prettifier: `-` / `_` → spaces, then Title Case each word. */
export function formatDisplayName(value: string): string {
  const cleaned = value.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return value;
  return cleaned.replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

/**
 * Activity UI timestamp: app locale + local timezone.
 * Today → time only; same year → month/day + time; otherwise year + month/day + time.
 */
export function formatActivityTime(
  iso: string | null | undefined,
  locale = "en",
  now: Date = new Date(),
): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  };
  if (!sameDay) {
    options.month = "short";
    options.day = "numeric";
    if (date.getFullYear() !== now.getFullYear()) {
      options.year = "numeric";
    }
  }
  return date.toLocaleString(locale, options);
}

/** @deprecated Prefer `formatActivityTime`. */
export const formatUpdatedAt = formatActivityTime;
