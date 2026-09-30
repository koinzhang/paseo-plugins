import assert from "node:assert/strict";
import { test } from "node:test";
import {
  INBOX_FILTER_DEFAULTS,
  inboxListSort,
  inboxFilterSettings,
  migrateInboxFilters,
  visibleInboxFilters,
  type InboxFilters,
} from "./filter-settings.ts";

test("missing filter settings parse as the defaults", () => {
  assert.deepEqual(inboxFilterSettings.schema.parse({}), INBOX_FILTER_DEFAULTS);
});

test("version 1 documents keep their fields for the current schema", () => {
  assert.deepEqual(migrateInboxFilters({ kind: "note" }, 1), { kind: "note" });
});

test("a document saved before sort existed defaults to updated", () => {
  assert.equal(
    inboxFilterSettings.schema.parse({
      kind: "agent",
      projectKey: null,
      workspaceId: "ws",
      panelKind: "note",
    }).sort,
    "updated",
  );
});

test("global workspace and project chips apply to every kind", () => {
  const filters: InboxFilters = {
    kind: "all",
    projectKey: "repo",
    workspaceId: "ws",
    panelKind: "agent",
    sort: "name",
  };
  for (const kind of ["all", "agent", "note", "scratch"] as const) {
    assert.deepEqual(visibleInboxFilters({ ...filters, kind }, {}), {
      kind,
      projectKey: "repo",
      workspaceId: "ws",
    });
  }
});

test("explorer panel uses its own group and ignores the global chips", () => {
  const filters: InboxFilters = {
    kind: "note",
    projectKey: "repo",
    workspaceId: "other",
    panelKind: "scratch",
    sort: "starred",
  };
  assert.deepEqual(visibleInboxFilters(filters, { workspaceId: "ws" }), {
    kind: "scratch",
    projectKey: null,
    workspaceId: "ws",
  });
  assert.equal(inboxListSort(filters, {}), "starred");
  assert.equal(inboxListSort(filters, { workspaceId: "ws" }), "updated");
});
