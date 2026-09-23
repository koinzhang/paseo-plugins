import assert from "node:assert/strict";
import { test } from "node:test";
import { BUILTIN_SIDEBAR_NAV_IDS, isSidebarNavTestId } from "./sidebar-nav.ts";

test("built-in navigation test IDs are unique", () => {
  assert.equal(new Set(BUILTIN_SIDEBAR_NAV_IDS).size, BUILTIN_SIDEBAR_NAV_IDS.length);
});

test("matches built-in and plugin sidebar items only", () => {
  for (const id of BUILTIN_SIDEBAR_NAV_IDS) assert.ok(isSidebarNavTestId(id), id);
  assert.ok(isSidebarNavTestId("plugin-sidebar-activity-main"));
  assert.ok(!isSidebarNavTestId("sidebar-settings"));
  assert.ok(!isSidebarNavTestId("sidebar-workspace-row-1"));
  assert.ok(!isSidebarNavTestId(null));
});
