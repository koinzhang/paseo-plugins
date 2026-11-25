export function defaultScopeSelection<T extends string>({
  selected,
  available,
  isPlaceholderData,
}: {
  selected: T[] | null;
  available: T[];
  isPlaceholderData: boolean;
}): T[] | null {
  if (selected !== null || isPlaceholderData) return selected;
  return available;
}
