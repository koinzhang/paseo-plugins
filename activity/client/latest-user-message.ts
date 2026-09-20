/**
 * Structural timeline entry shape for user-message previews.
 *
 * Do not import `@getpaseo/protocol/*` from client/: Paseo compiles plugins
 * without installing that package, and type-only imports still fail the
 * `paseo-plugin-client-runtime-boundary` build (see server/host-types.ts).
 */
export type TimelineTailEntry = {
  item: {
    type: string;
    text?: string | null;
  };
  seqStart?: number;
  timestamp?: string;
};

type TimelineApi = {
  agents: {
    ref: (agentId: string) => {
      timeline: {
        refetch: (options: {
          projection?: "canonical" | "projected";
          direction?: "tail" | "before" | "after";
          limit?: number;
        }) => Promise<{
          error?: string | null;
          entries?: ReadonlyArray<TimelineTailEntry> | null;
        }>;
      };
    };
  };
};

/** Newest non-empty user_message; prefers higher seq/ts, else later list index (tail order). */
export function pickLatestUserMessageText(
  entries: ReadonlyArray<TimelineTailEntry>,
): string | null {
  let best: { text: string; seq: number; ts: string; index: number } | null = null;
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index]!;
    if (entry.item.type !== "user_message") continue;
    const text = entry.item.text?.trim();
    if (!text) continue;
    const seq = entry.seqStart ?? -1;
    const ts = entry.timestamp ?? "";
    if (
      !best ||
      seq > best.seq ||
      (seq === best.seq && ts > best.ts) ||
      (seq === best.seq && ts === best.ts && index > best.index)
    ) {
      best = { text, seq, ts, index };
    }
  }
  return best?.text ?? null;
}

/** Single-line preview for list meta; collapses whitespace. */
export function formatMessagePreview(text: string, maxChars = 72): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= maxChars) return oneLine;
  return `${oneLine.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
}

async function refetchPreview(
  paseo: TimelineApi,
  agentId: string,
  projection: "projected" | "canonical",
): Promise<string | null> {
  const page = await paseo.agents.ref(agentId).timeline.refetch({
    projection,
    direction: "tail",
    limit: 80,
  });
  if (page.error) throw new Error(page.error);
  const text = pickLatestUserMessageText(page.entries ?? []);
  return text ? formatMessagePreview(text) : null;
}

/**
 * Read the newest user prompt from the host timeline (not local SQLite —
 * message bodies are intentionally not stored in usage.db).
 * Prefer projected (UI text), then canonical.
 */
export async function fetchLatestUserMessagePreview(
  paseo: TimelineApi,
  agentId: string,
): Promise<string | null> {
  try {
    const projected = await refetchPreview(paseo, agentId, "projected");
    if (projected) return projected;
  } catch (error) {
    console.warn("[activity] projected timeline preview failed", agentId, error);
  }
  return refetchPreview(paseo, agentId, "canonical");
}
