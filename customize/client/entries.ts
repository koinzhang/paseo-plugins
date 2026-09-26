import { CATEGORIES, type Category, type Entry, type Scope } from "../shared/contracts.ts";

export interface SourceGroup {
  source: string;
  entries: Entry[];
}

export interface ScopeGroup {
  scope: Scope;
  count: number;
  sources: SourceGroup[];
}

const SCOPE_ORDER: readonly Scope[] = ["project", "user"];

export const SKILL_INVOCATION_FILTERS = ["all", "auto", "manual"] as const;
export type SkillInvocationFilter = (typeof SKILL_INVOCATION_FILTERS)[number];

/** Auto includes conditional discovery. Manual is explicit invocation only. */
export function matchesSkillInvocation(entry: Entry, filter: SkillInvocationFilter): boolean {
  if (filter === "all") return true;
  if (filter === "manual") return entry.status === "manual";
  return entry.status === "auto" || entry.status === "conditional";
}

export function countSkillInvocation(entries: readonly Entry[]): Record<SkillInvocationFilter, number> {
  const counts: Record<SkillInvocationFilter, number> = { all: 0, auto: 0, manual: 0 };
  for (const entry of entries) {
    if (entry.category !== "skills") continue;
    counts.all++;
    if (matchesSkillInvocation(entry, "auto")) counts.auto++;
    else if (matchesSkillInvocation(entry, "manual")) counts.manual++;
  }
  return counts;
}

export function countByCategory(entries: readonly Entry[]): Record<Category, number> {
  const out = Object.fromEntries(CATEGORIES.map((category) => [category, 0])) as Record<Category, number>;
  for (const entry of entries) out[entry.category]++;
  return out;
}

export function matchesQuery(entry: Entry, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [entry.name, entry.dir, entry.source, entry.description ?? ""].some((field) => field.toLowerCase().includes(needle));
}

/** Project first, then user; within a scope, sources keep discovery order. Skill invocation applies only to skills. */
export function groupEntries(
  entries: readonly Entry[],
  category: Category,
  query: string,
  skillFilter: SkillInvocationFilter = "all",
): ScopeGroup[] {
  return SCOPE_ORDER.map((scope) => {
    const sources = new Map<string, Entry[]>();
    for (const entry of entries) {
      if (entry.category !== category || entry.scope !== scope || !matchesQuery(entry, query)) continue;
      if (category === "skills" && !matchesSkillInvocation(entry, skillFilter)) continue;
      const list = sources.get(entry.source) ?? [];
      list.push(entry);
      sources.set(entry.source, list);
    }
    const groups = [...sources].map(([source, list]) => ({ source, entries: list }));
    return { scope, count: groups.reduce((sum, group) => sum + group.entries.length, 0), sources: groups };
  });
}

/** Last directory segment the project root display name falls back to. */
export function projectLabel(root: string): string {
  const trimmed = root.replace(/[\\/]+$/, "");
  return trimmed.split(/[\\/]/).pop() || trimmed;
}
