/** Collapse `homeDir` prefix to `~` so RPC/UI never expose `/Users/…`. */
export function collapseHomePath(path: string, homeDir: string): string {
  const trimmed = path.trim();
  if (!trimmed || !homeDir) return trimmed;
  if (trimmed === homeDir) return "~";
  const prefix = homeDir.endsWith("/") ? homeDir : `${homeDir}/`;
  if (trimmed.startsWith(prefix)) {
    return `~/${trimmed.slice(prefix.length)}`;
  }
  // Case-insensitive match (macOS default FS); preserve the remainder as-is.
  const lower = trimmed.toLowerCase();
  const homeLower = homeDir.toLowerCase();
  if (lower === homeLower) return "~";
  const prefixLower = homeLower.endsWith("/") ? homeLower : `${homeLower}/`;
  if (lower.startsWith(prefixLower)) {
    return `~/${trimmed.slice(prefixLower.length)}`;
  }
  return trimmed;
}
