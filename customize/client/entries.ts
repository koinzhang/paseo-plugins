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

/** Project first, then user; within a scope, sources keep discovery order. */
export function groupEntries(entries: readonly Entry[], category: Category, query: string): ScopeGroup[] {
  return SCOPE_ORDER.map((scope) => {
    const sources = new Map<string, Entry[]>();
    for (const entry of entries) {
      if (entry.category !== category || entry.scope !== scope || !matchesQuery(entry, query)) continue;
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
