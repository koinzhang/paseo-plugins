import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";
import { ItemSort } from "./contracts.ts";

const FilterKinds = z.array(z.enum(["agent", "note"]));

/** Older documents have no `sort`; the schema default fills it in. */
export function migrateInboxFilters(values: unknown, fromVersion: number): unknown {
  if (!values || typeof values !== "object" || Array.isArray(values)) return values;
  const filters = values as Record<string, unknown>;
  if (fromVersion >= 5) return { ...filters, projectKeys: [], workspaceIds: [] };
  const migrateKind = (kind: unknown) => Array.isArray(kind) ? kind : kind === "agent" || kind === "note" ? [kind] : ["agent", "note"];
  const selected = (value: unknown) => typeof value === "string" ? [value] : [];
  return {
    ...("sort" in filters ? { sort: filters.sort } : {}),
    kinds: migrateKind(filters.kind ?? filters.kinds),
    panelKinds: migrateKind(filters.panelKind ?? filters.panelKinds),
    projectKeys: selected(filters.projectKey),
    workspaceIds: selected(filters.workspaceId),
  };
}

/** Host-scoped Inbox filters. The global page and the Explorer panel each keep their own group. */
export const inboxFilterSettings = defineSettings({
  id: "list-filters",
  scope: "host",
  version: 7,
  schema: z.object({
    kinds: FilterKinds.default(["agent", "note"]),
    projectKeys: z.array(z.string()).default([]),
    workspaceIds: z.array(z.string()).default([]),
    panelKinds: FilterKinds.default(["agent", "note"]),
    /** Global page sort. The Explorer panel always lists by last update. */
    sort: ItemSort.default("updated"),
  }),
  migrate: migrateInboxFilters,
});

export type InboxFilters = z.infer<typeof inboxFilterSettings.schema>;

export const INBOX_FILTER_DEFAULTS: InboxFilters = {
  kinds: ["agent", "note"],
  projectKeys: [],
  workspaceIds: [],
  panelKinds: ["agent", "note"],
  sort: "updated",
};

export function sameInboxFilters(a: InboxFilters, b: InboxFilters): boolean {
  return (
    a.kinds.length === b.kinds.length && a.kinds.every((kind, index) => kind === b.kinds[index]) &&
    JSON.stringify(a.projectKeys) === JSON.stringify(b.projectKeys) &&
    JSON.stringify(a.workspaceIds) === JSON.stringify(b.workspaceIds) &&
    a.panelKinds.length === b.panelKinds.length && a.panelKinds.every((kind, index) => kind === b.panelKinds[index]) &&
    a.sort === b.sort
  );
}

/** Sort applied to a list. Explorer panels stay on last update. */
export function inboxListSort(filters: InboxFilters, surface: { workspaceId?: string }): InboxFilters["sort"] {
  return surface.workspaceId ? "updated" : filters.sort;
}

export interface VisibleInboxFilters {
  kinds: InboxFilters["kinds"];
  projectKeys: string[] | null;
  workspaceIds: string[];
}

/**
 * Filters that actually narrow the list. A workspace panel always scopes to that
 * workspace and ignores the global page's project and workspace chips.
 */
export function visibleInboxFilters(
  filters: InboxFilters,
  surface: { workspaceId?: string },
): VisibleInboxFilters {
  if (surface.workspaceId) {
    return { kinds: filters.panelKinds, projectKeys: null, workspaceIds: [surface.workspaceId] };
  }
  return { kinds: filters.kinds, projectKeys: filters.projectKeys, workspaceIds: filters.workspaceIds };
}
