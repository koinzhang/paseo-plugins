/** Preserve results for this plugin/host lifetime and reload saved metadata when revisited. */
export const REVISIT_QUERY_POLICY = {
  gcTime: Infinity,
  refetchOnMount: "always",
} as const;

export const SCAN_QUERY_POLICY = {
  ...REVISIT_QUERY_POLICY,
  staleTime: 0,
} as const;

export function shouldScanSnapshot(saved: { stale: boolean } | undefined, fetching: boolean, failed: boolean): boolean {
  return !fetching && (saved?.stale ?? failed);
}

export function newestScan<T extends { scannedAt: string }>(saved: T | null | undefined, live: T | null | undefined): T | null {
  if (!saved) return live ?? null;
  if (!live) return saved;
  return Date.parse(live.scannedAt) >= Date.parse(saved.scannedAt) ? live : saved;
}
