/** Preserve results for this plugin/host lifetime and refresh whenever revisited. */
export const REVISIT_QUERY_POLICY = {
  gcTime: Infinity,
  refetchOnMount: "always",
} as const;

export const SCAN_QUERY_POLICY = {
  ...REVISIT_QUERY_POLICY,
  staleTime: 0,
} as const;
