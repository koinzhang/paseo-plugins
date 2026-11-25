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
  assert.deepEqual(migrateInboxFilters({ kind: "note" }, 1), {
    kinds: ["note"], panelKinds: ["agent", "note"],
    projectKeys: null, workspaceIds: null,
  });
});

test("scratch filters migrate to all without discarding other settings", () => {
  const previous = {
    kind: "scratch",
    projectKey: "repo",
    workspaceId: "ws",
    panelKind: "scratch",
    sort: "name",
  };
  assert.deepEqual(migrateInboxFilters(previous, 2), {
    projectKeys: ["repo"], workspaceIds: ["ws"], sort: "name",
    kinds: ["agent", "note"], panelKinds: ["agent", "note"],
  });
  assert.deepEqual(migrateInboxFilters(previous, 4), {
    projectKeys: ["repo"], workspaceIds: ["ws"], sort: "name",
    kinds: ["agent", "note"], panelKinds: ["agent", "note"],
  });
  assert.deepEqual(migrateInboxFilters({ projectKeys: [], workspaceIds: [], kinds: ["note"] }, 5), {
    projectKeys: [], workspaceIds: [], kinds: ["note"],
  });
});

test("a document saved before sort existed defaults to updated", () => {
  assert.equal(
    inboxFilterSettings.schema.parse({
      kinds: ["agent"],
      projectKeys: [],
      workspaceIds: ["ws"],
      panelKinds: ["note"],
    }).sort,
    "updated",
  );
});

test("global workspace and project multi-selection applies to every kind", () => {
  const filters: InboxFilters = {
    kinds: ["agent", "note"],
    projectKeys: ["repo", "second"],
    workspaceIds: ["ws", "feature"],
    panelKinds: ["agent"],
    sort: "name",
  };
  for (const kinds of [["agent", "note"], ["agent"], ["note"]] as InboxFilters["kinds"][]) {
    assert.deepEqual(visibleInboxFilters({ ...filters, kinds }, {}), {
      kinds,
      projectKeys: ["repo", "second"],
      workspaceIds: ["ws", "feature"],
    });
  }
});

test("explorer panel uses its own group and ignores the global chips", () => {
  const filters: InboxFilters = {
    kinds: ["note"],
    projectKeys: ["repo"],
    workspaceIds: ["other"],
    panelKinds: ["note"],
    sort: "starred",
  };
  assert.deepEqual(visibleInboxFilters(filters, { workspaceId: "ws" }), {
    kinds: ["note"],
    projectKeys: null,
    workspaceIds: ["ws"],
  });
  assert.equal(inboxListSort(filters, {}), "starred");
  assert.equal(inboxListSort(filters, { workspaceId: "ws" }), "updated");
});

test("empty old scope selections become defaults while selected scopes migrate to arrays", () => {
  assert.deepEqual(migrateInboxFilters({ kinds: ["note"], projectKey: "repo", workspaceId: null, sort: "updated" }, 4), {
    kinds: ["note"], panelKinds: ["agent", "note"], projectKeys: ["repo"], workspaceIds: null, sort: "updated",
  });
  const parsed = inboxFilterSettings.schema.parse(migrateInboxFilters({ kind: "agent", projectKey: "repo", workspaceId: "ws" }, 1));
  assert.deepEqual(visibleInboxFilters(parsed, {}).projectKeys, ["repo"]);
  assert.deepEqual(visibleInboxFilters(parsed, {}).workspaceIds, ["ws"]);
  assert.deepEqual(visibleInboxFilters(INBOX_FILTER_DEFAULTS, {}).projectKeys, null);
  assert.deepEqual(visibleInboxFilters(INBOX_FILTER_DEFAULTS, {}).workspaceIds, null);
  assert.deepEqual(migrateInboxFilters({ kinds: ["note"], projectKeys: [], workspaceIds: ["ws"] }, 5), {
    kinds: ["note"], projectKeys: [], workspaceIds: ["ws"],
  });
});

test("Agents and Notes are independently selectable, including neither", () => {
  const filters = inboxFilterSettings.schema.parse({ kinds: [], panelKinds: ["agent"] });
  assert.deepEqual(filters.kinds, []);
  assert.deepEqual(filters.panelKinds, ["agent"]);
  assert.deepEqual(visibleInboxFilters(filters, { workspaceId: "ws" }).kinds, ["agent"]);
});
