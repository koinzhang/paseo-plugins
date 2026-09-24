import { CATEGORIES, type Category } from "./contracts.ts";
import { MECHANISMS } from "./mechanisms.ts";
import type { ProviderId } from "./providers.ts";

/** Confirmed provider features whose local discovery locations are not yet verified. */
const CAPABILITIES_WITHOUT_SCAN: Partial<Record<ProviderId, readonly Category[]>> = {
  claude: ["subagents", "plugins"],
  codex: ["subagents", "plugins"],
  copilot: ["subagents", "plugins"],
  opencode: ["commands", "subagents", "plugins"],
  pi: ["commands", "plugins"],
  omp: ["commands", "subagents", "plugins"],
  cline: ["commands"],
  kilo: ["plugins"],
  traecli: ["plugins"],
};

export function visibleCategories(provider: ProviderId): Category[] {
  const unscanned: readonly Category[] = CAPABILITIES_WITHOUT_SCAN[provider] ?? [];
  return CATEGORIES.filter((category) => MECHANISMS[provider][category].supported || unscanned.includes(category));
}

export function resolveCategory(provider: ProviderId, selected: Category): Category {
  const visible = visibleCategories(provider);
  return visible.includes(selected) ? selected : visible[0] ?? "instructions";
}
