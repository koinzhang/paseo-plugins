export interface NoteComposer {
  insertText(text: string): void;
  focus(): Promise<void>;
}

export async function insertNoteIntoComposer(
  composer: NoteComposer,
  body: string,
): Promise<void> {
  composer.insertText(body);
  await composer.focus();
}
