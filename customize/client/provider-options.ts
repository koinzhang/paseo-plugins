import { PROVIDER_IDS, PROVIDER_LABELS, type ProviderId } from "../shared/providers.ts";

export interface ProviderSnapshotOptionEntry {
  provider: string;
  enabled: boolean;
  source?: "builtin" | "custom";
  label?: string;
}

export interface ProviderMenuOption {
  id: ProviderId;
  label: string;
  badge: string;
}

const BUILTIN_IDS = new Set<ProviderId>(["claude", "codex", "copilot", "opencode", "pi", "omp"]);

/** Only providers with a Customize scanner can be offered. */
export function enabledProviderOptions(
  entries: readonly ProviderSnapshotOptionEntry[],
  builtinLabel: string,
): ProviderMenuOption[] {
  const byId = new Map(entries.map((entry) => [entry.provider, entry]));
  return PROVIDER_IDS.flatMap((id) => {
    const entry = byId.get(id);
    if (!entry?.enabled) return [];
    return [{
      id,
      label: entry.label || PROVIDER_LABELS[id],
      badge: entry.source === "custom" || (entry.source == null && !BUILTIN_IDS.has(id)) ? "ACP" : builtinLabel,
    }];
  });
}

export function selectedProvider(saved: ProviderId, options: readonly ProviderMenuOption[]): ProviderId | null {
  return options.some((option) => option.id === saved) ? saved : options[0]?.id ?? null;
}
