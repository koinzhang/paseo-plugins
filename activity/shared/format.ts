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

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Compact count for KPI tiles: 9999 → `9999`, 12345 → `12.3k`, 1234567 → `1.2M`. */
export function formatCount(value: number): string {
  if (value >= 1_000_000) return `${Number((value / 1_000_000).toFixed(1))}M`;
  if (value >= 10_000) return `${Number((value / 1_000).toFixed(1))}k`;
  return String(value);
}

/** Compact locale-independent duration for agent lifetimes (049). */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  if (ms < MINUTE_MS) return "<1 min";
  if (ms < HOUR_MS) return `${Math.floor(ms / MINUTE_MS)} min`;
  const hours = ms / HOUR_MS;
  if (hours < 48) return `${Number(hours.toFixed(1))} h`;
  const days = ms / DAY_MS;
  if (days < 60) return `${Number(days.toFixed(1))} days`;
  return `${Number((days / 30.44).toFixed(1))} months`;
}
