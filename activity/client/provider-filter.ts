/** Max provider chips shown in the global Activity filter bar (excludes All). */
export const PROVIDER_FILTER_LIMIT = 5;

export type ProviderFilterCandidate = {
  provider: string;
  label: string;
  agentCount: number;
  messageCount: number;
};

/**
 * Rank provider chips for the global filter bar: most agents first, then most
 * messages, then provider id. Caps the list at `limit`; a selected provider that
 * fell out of the top `limit` replaces the last entry so the filter stays visible.
 */
export function selectProviderOptions(
  providers: ReadonlyArray<ProviderFilterCandidate>,
  selected: string,
  limit = PROVIDER_FILTER_LIMIT,
): Array<{ id: string; label: string }> {
  const capped = Math.max(0, limit);
  const ranked = [...providers].sort(
    (a, b) =>
      b.agentCount - a.agentCount ||
      b.messageCount - a.messageCount ||
      a.provider.localeCompare(b.provider),
  );
  const top = ranked.slice(0, capped);
  if (capped === 0 || selected === "all") return top.map(toOption);
  const selectedProvider = providers.find((item) => item.provider === selected);
  if (!selectedProvider || top.some((item) => item.provider === selected)) {
    return top.map(toOption);
  }
  if (top.length === capped) {
    top[top.length - 1] = selectedProvider;
  } else {
    top.push(selectedProvider);
  }
  return top.map(toOption);
}

function toOption(item: ProviderFilterCandidate): { id: string; label: string } {
  return { id: item.provider, label: item.label };
}
