/**
 * Card-view grid metrics (re-exported by `design-tokens.ts`).
 * Kept in this React Native-free module so Node tests can import the grid math.
 */
export const GRID = { minCardWidth: 240, maxColumns: 3, gap: 12, labelGap: 6 } as const;

/** Card columns for the measured content width; 0 means not measured yet. */
export function gridColumns(availableWidth: number): number {
  if (!(availableWidth > 0)) return 1;
  const columns = Math.floor((availableWidth + GRID.gap) / (GRID.minCardWidth + GRID.gap));
  return Math.max(1, Math.min(GRID.maxColumns, columns));
}

/** Card width for a column count; undefined until the content width is measured. */
export function cardWidth(availableWidth: number, columns: number): number | undefined {
  if (!(availableWidth > 0) || columns < 1) return undefined;
  return (availableWidth - GRID.gap * (columns - 1)) / columns;
}
