export function shouldSelectFirstItem({
  globalSurface,
  selection,
  firstItemId,
  isPlaceholderData,
}: {
  globalSurface: boolean;
  selection: { id: string | null } | null;
  firstItemId: string | undefined;
  isPlaceholderData: boolean;
}): boolean {
  return globalSurface && selection === null && !isPlaceholderData && firstItemId !== undefined;
}
