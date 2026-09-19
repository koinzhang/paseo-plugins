/** Capture output ends with blank rows for a fresh shell; keep the last N meaningful lines. */
export function terminalPreviewLines(
  lines: ReadonlyArray<string>,
  max: number,
): string[] {
  let end = lines.length;
  while (end > 0 && (lines[end - 1] ?? "").trim() === "") end -= 1;
  const start = Math.max(0, end - max);
  return lines.slice(start, end);
}
