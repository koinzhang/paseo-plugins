/** A note with neither a title nor body text is never stored. */
export function isEmptyNote(title: string | null | undefined, body: string): boolean {
  return !title?.trim() && !body.trim();
}
