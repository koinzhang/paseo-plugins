import type { AgentTimelineItem } from "@getpaseo/protocol/agent-types";

export type TimelineTailEntry = {
  item: AgentTimelineItem;
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
          entries: ReadonlyArray<TimelineTailEntry>;
        }>;
      };
    };
  };
};

/** Newest non-empty user_message text on a timeline page (by seq, then timestamp). */
export function pickLatestUserMessageText(
  entries: ReadonlyArray<TimelineTailEntry>,
): string | null {
  let best: { text: string; seq: number; ts: string } | null = null;
  for (const entry of entries) {
    if (entry.item.type !== "user_message") continue;
    const text = entry.item.text?.trim();
    if (!text) continue;
    const seq = entry.seqStart ?? 0;
    const ts = entry.timestamp ?? "";
    if (
      !best ||
      seq > best.seq ||
      (seq === best.seq && ts > best.ts)
    ) {
      best = { text, seq, ts };
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

/**
 * Read the newest user prompt from the host timeline (not local SQLite —
 * message bodies are intentionally not stored in usage.db).
 */
export async function fetchLatestUserMessagePreview(
  paseo: TimelineApi,
  agentId: string,
): Promise<string | null> {
  const page = await paseo.agents.ref(agentId).timeline.refetch({
    projection: "canonical",
    direction: "tail",
    limit: 80,
  });
  if (page.error) throw new Error(page.error);
  const text = pickLatestUserMessageText(page.entries);
  return text ? formatMessagePreview(text) : null;
}
