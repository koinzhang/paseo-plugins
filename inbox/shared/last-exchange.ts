/** Timeline row shape used to find the latest prompt and reply. */
export interface ExchangeEntry {
  item: { type: string; text?: string | null };
  seqStart?: number;
  timestamp?: string;
}

export interface LastExchange {
  prompt: string | null;
  agent: string | null;
}

export interface ExchangeCursor {
  epoch: string;
  seq: number;
}

export interface ExchangePage {
  entries?: ReadonlyArray<ExchangeEntry> | null;
  hasOlder?: boolean;
  startCursor?: ExchangeCursor | null;
  error?: string | null;
}

const PAGE_LIMIT = 80;
const MAX_PAGES = 5;
/** Detail text cap; longer replies stay on the agent itself. */
const EXCERPT_CHARS = 2000;

function ordered(entries: readonly ExchangeEntry[]) {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const seqA = a.entry.seqStart ?? -1;
      const seqB = b.entry.seqStart ?? -1;
      if (seqA !== seqB) return seqA - seqB;
      const tsA = a.entry.timestamp ?? "";
      const tsB = b.entry.timestamp ?? "";
      if (tsA !== tsB) return tsA < tsB ? -1 : 1;
      return a.index - b.index;
    });
}

/**
 * Newest non-empty user prompt, and the newest run of assistant chunks.
 * A run stops at any other item, so an earlier reply split by a tool call is kept whole
 * and a later one replaces it. Blank runs are skipped.
 */
export function pickLastExchange(entries: readonly ExchangeEntry[]): LastExchange {
  const rows = ordered(entries);
  let prompt: string | null = null;
  for (const { entry } of rows) {
    if (entry.item.type !== "user_message") continue;
    const text = entry.item.text?.trim();
    if (text) prompt = text;
  }

  let agent: string | null = null;
  for (let index = rows.length - 1; index >= 0; ) {
    if (rows[index]!.entry.item.type !== "assistant_message") {
      index -= 1;
      continue;
    }
    const chunks: string[] = [];
    while (index >= 0 && rows[index]!.entry.item.type === "assistant_message") {
      const text = rows[index]!.entry.item.text;
      if (typeof text === "string") chunks.push(text);
      index -= 1;
    }
    const text = chunks.toReversed().join("").trim();
    if (text) {
      agent = text;
      break;
    }
  }
  return { prompt, agent };
}

/** The newest assistant run starts at the first row we have, so an older page may hold its beginning. */
export function assistantRunReachesStart(entries: readonly ExchangeEntry[]): boolean {
  const rows = ordered(entries);
  let index = rows.length - 1;
  while (index >= 0 && rows[index]!.entry.item.type !== "assistant_message") index -= 1;
  if (index < 0) return false;
  while (index >= 0 && rows[index]!.entry.item.type === "assistant_message") index -= 1;
  return index < 0;
}

export function excerpt(text: string, maxChars = EXCERPT_CHARS): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars).trimEnd()}…`;
}

/**
 * Walk the timeline tail toward older pages until both sides are found and the
 * newest reply is not cut off by the window, or the page cap is hit.
 */
export async function readLastExchange(
  fetchPage: (input: { direction: "tail" | "before"; cursor?: ExchangeCursor }) => Promise<ExchangePage>,
): Promise<LastExchange> {
  let collected: ExchangeEntry[] = [];
  let cursor: ExchangeCursor | undefined;
  let direction: "tail" | "before" = "tail";
  let picked: LastExchange = { prompt: null, agent: null };
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await fetchPage({
      direction,
      ...(cursor !== undefined ? { cursor } : {}),
    });
    if (result.error) throw new Error(result.error);
    const entries = result.entries ?? [];
    collected = direction === "tail" ? [...entries] : [...entries, ...collected];
    picked = pickLastExchange(collected);
    const truncated = assistantRunReachesStart(collected);
    if (picked.prompt && picked.agent && !truncated) return picked;
    if (!result.hasOlder || result.startCursor == null) return picked;
    direction = "before";
    cursor = result.startCursor;
  }
  return picked;
}

export const LAST_EXCHANGE_PAGE_LIMIT = PAGE_LIMIT;
