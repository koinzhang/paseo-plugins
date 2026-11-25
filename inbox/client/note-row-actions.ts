export function showsNoteRowActions({
  web,
  hovered,
  busy,
}: {
  web: boolean;
  hovered: boolean;
  busy: boolean;
}): boolean {
  return !web || hovered || busy;
}
