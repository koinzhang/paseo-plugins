import { PROVIDER_IDS, PROVIDER_LABELS, type ProviderId } from "../shared/providers.ts";

export interface ProviderSnapshotOptionEntry {
  provider: string;
  enabled: boolean;
  source?: "builtin" | "custom";
  label?: string;
}

export type ProviderMenuGroup = "builtin" | "acp";

export interface ProviderMenuOption {
  id: ProviderId;
  label: string;
  badge: string;
  group: ProviderMenuGroup;
}

const BUILTIN_IDS = new Set<ProviderId>(["claude", "codex", "copilot", "opencode", "pi", "omp"]);

const GROUP_ORDER: Record<ProviderMenuGroup, number> = { builtin: 0, acp: 1 };

/** Only providers with a Customize scanner can be offered; built-ins come first, each group by name. */
export function enabledProviderOptions(
  entries: readonly ProviderSnapshotOptionEntry[],
  builtinLabel: string,
): ProviderMenuOption[] {
  const byId = new Map(entries.map((entry) => [entry.provider, entry]));
  const options = PROVIDER_IDS.flatMap<ProviderMenuOption>((id) => {
    const entry = byId.get(id);
    if (!entry?.enabled) return [];
    const acp = entry.source === "custom" || (entry.source == null && !BUILTIN_IDS.has(id));
    return [{
      id,
      label: entry.label || PROVIDER_LABELS[id],
      badge: acp ? "ACP" : builtinLabel,
      group: acp ? "acp" : "builtin",
    }];
  });
  return options.sort((a, b) =>
    GROUP_ORDER[a.group] - GROUP_ORDER[b.group]
    || a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
  );
}

export function selectedProvider(saved: ProviderId, options: readonly ProviderMenuOption[]): ProviderId | null {
  return options.some((option) => option.id === saved) ? saved : options[0]?.id ?? null;
}
