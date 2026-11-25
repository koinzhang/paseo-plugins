/** A note with neither a title nor body text is never stored. */
export function isEmptyNote(title: string | null | undefined, body: string): boolean {
  return !title?.trim() && !body.trim();
}

export interface NoteText {
  title: string;
  body: string;
}

export function syncNoteText(current: NoteText, saved: NoteText, incoming: NoteText): NoteText | null {
  if (current.title !== saved.title || current.body !== saved.body) return null;
  return incoming;
}
