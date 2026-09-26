export interface PromptTimelineEntry {
  item: { type: string; text?: string | null };
  seqStart?: number;
}

/** Returns the newest non-empty user prompt while preserving its original text. */
export function latestUserPrompt(
  entries: readonly PromptTimelineEntry[],
): string | null {
  let latest: { text: string; seq: number; index: number } | null = null;
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index]!;
    if (entry.item.type !== "user_message" || !entry.item.text?.trim()) continue;
    const seq = entry.seqStart ?? -1;
    if (!latest || seq > latest.seq || (seq === latest.seq && index > latest.index)) {
      latest = { text: entry.item.text, seq, index };
    }
  }
  return latest?.text ?? null;
}

/** Appends optional instructions after the previous prompt, separated by one newline. */
export function composeResendPrompt(prompt: string, args: string): string {
  const extra = args.trim();
  return extra ? `${prompt}\n${extra}` : prompt;
}
