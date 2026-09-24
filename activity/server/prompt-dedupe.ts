import type { UserMessageRow } from "./store.ts";

/** App client ids (`app/src/types/stream.ts`); provider ids never take this shape. */
const LIVE_MESSAGE_ID = /^(draft_)?msg_\d{13}_/;
const TIMED_REPLAY_WINDOW_MS = 2_000;
const ANONYMOUS_REPLAY_BATCH_MS = 60_000;

function time(value: string | null): number | null {
  if (value == null) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Replayed copies of prompts already stored under their live client id, for one
 * agent's rows. The host keeps the provider id of a live prompt internal, so a
 * replay after reload arrives under a different key (075).
 */
export function replayDuplicateMessageIds(rows: readonly UserMessageRow[]): Set<string> {
  const duplicates = new Set<string>();
  const live = rows.filter(row => LIVE_MESSAGE_ID.test(row.messageId));
  if (live.length === 0) return duplicates;

  const liveTimes = live.map(row => time(row.ts)).filter((t): t is number => t != null);
  for (const row of rows) {
    if (LIVE_MESSAGE_ID.test(row.messageId) || row.messageId.startsWith("canonical:")) continue;
    const t = time(row.ts);
    if (t != null && liveTimes.some(liveTime => Math.abs(t - liveTime) <= TIMED_REPLAY_WINDOW_MS)) {
      duplicates.add(row.messageId);
    }
  }

  const anonymous = rows
    .filter(row => row.messageId.startsWith("canonical:"))
    .map(row => ({ row, t: time(row.ts ?? row.ingestedAt) }))
    .filter((entry): entry is { row: UserMessageRow; t: number } => entry.t != null);
  if (anonymous.length === 0) return duplicates;
  const batchStart = Math.min(...anonymous.map(entry => entry.t));
  // Anonymous replays carry the replay instant, so only a count of the live
  // prompts sent before it can pair them; the newest replayed ones are dropped.
  const liveBefore = live.filter(row => {
    const t = time(row.ts ?? row.ingestedAt);
    return t != null && t < batchStart;
  }).length;
  const batch = anonymous
    .filter(entry => entry.t <= batchStart + ANONYMOUS_REPLAY_BATCH_MS)
    .sort((a, b) => (a.row.seq ?? -1) - (b.row.seq ?? -1));
  for (const { row } of batch.slice(batch.length - Math.min(liveBefore, batch.length))) {
    duplicates.add(row.messageId);
  }
  return duplicates;
}
