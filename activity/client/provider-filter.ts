export type ProviderFilterCandidate = {
  provider: string;
  label: string;
  agentCount: number;
  messageCount: number;
};

/**
 * Rank provider options for the global filter dropdown: most sessions first,
 * then most messages, then provider id. Uncapped by default (069); with a
 * `limit`, a selected provider that fell out of the top `limit` replaces the
 * last entry so the filter stays visible.
 */
export function selectProviderOptions(
  providers: ReadonlyArray<ProviderFilterCandidate>,
  selected: string,
  limit = Number.POSITIVE_INFINITY,
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
