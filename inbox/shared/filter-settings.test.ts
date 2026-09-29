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

test("global workspace chip applies only while viewing agents", () => {
  const filters: InboxFilters = {
    kind: "note",
    projectKey: "repo",
    workspaceId: "ws",
    panelKind: "agent",
    sort: "name",
  };
  assert.deepEqual(visibleInboxFilters(filters, {}), {
    kind: "note",
    projectKey: "repo",
    workspaceId: null,
  });
  assert.deepEqual(visibleInboxFilters({ ...filters, kind: "agent" }, {}), {
    kind: "agent",
    projectKey: "repo",
    workspaceId: "ws",
  });
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
