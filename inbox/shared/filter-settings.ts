import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";
import { ItemSort } from "./contracts.ts";

const FilterKind = z.enum(["all", "agent", "note", "scratch"]);

/** Older documents have no `sort`; the schema default fills it in. */
export function migrateInboxFilters(values: unknown, fromVersion: number): unknown {
  if (fromVersion < 2) return values;
  return values;
}

/** Host-scoped Inbox filters. The global page and the Explorer panel each keep their own group. */
export const inboxFilterSettings = defineSettings({
  id: "list-filters",
  scope: "host",
  version: 2,
  schema: z.object({
    kind: FilterKind.default("all"),
    projectKey: z.string().nullable().default(null),
    /** Selected workspace chip on the global page. Applied only while `kind` is `agent`. */
    workspaceId: z.string().nullable().default(null),
    panelKind: FilterKind.default("all"),
    /** Global page sort. The Explorer panel always lists by last update. */
    sort: ItemSort.default("updated"),
  }),
  migrate: migrateInboxFilters,
});

export type InboxFilters = z.infer<typeof inboxFilterSettings.schema>;

export const INBOX_FILTER_DEFAULTS: InboxFilters = {
  kind: "all",
  projectKey: null,
  workspaceId: null,
  panelKind: "all",
  sort: "updated",
};

export function sameInboxFilters(a: InboxFilters, b: InboxFilters): boolean {
  return (
    a.kind === b.kind &&
    a.projectKey === b.projectKey &&
    a.workspaceId === b.workspaceId &&
    a.panelKind === b.panelKind &&
    a.sort === b.sort
  );
}

/** Sort applied to a list. Explorer panels stay on last update. */
export function inboxListSort(filters: InboxFilters, surface: { workspaceId?: string }): InboxFilters["sort"] {
  return surface.workspaceId ? "updated" : filters.sort;
}

export interface VisibleInboxFilters {
  kind: InboxFilters["kind"];
  projectKey: string | null;
  workspaceId: string | null;
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
    return { kind: filters.panelKind, projectKey: null, workspaceId: surface.workspaceId };
  }
  return {
    kind: filters.kind,
    projectKey: filters.projectKey,
    workspaceId: filters.kind === "agent" ? filters.workspaceId : null,
  };
}
