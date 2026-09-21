import assert from "node:assert/strict";
import { test } from "node:test";
import {
  explorerAgentDisplaySettings,
  migrateExplorerAgentDisplay,
} from "./explorer-agent-display.ts";

test("Explorer display settings default Skills and MCP to ranked", () => {
  const values = explorerAgentDisplaySettings.schema.parse({});
  assert.equal(values.rankView, "ranked");
});

test("Explorer display settings migrate v1 while preserving Agent filters", () => {
  const migrated = migrateExplorerAgentDisplay(
    {
      sort: "name",
      group: "provider",
      show: ["messages"],
      status: ["active", "archived"],
      lifecycle: ["running"],
    },
    1,
  );
  const values = explorerAgentDisplaySettings.schema.parse(migrated);
  assert.equal(values.rankView, "ranked");
  assert.equal(values.sort, "name");
  assert.deepEqual(values.status, ["active", "archived"]);
});

test("Explorer display settings preserve the v2 Skills view as the shared rank view", () => {
  const migrated = migrateExplorerAgentDisplay(
    {
      sort: "updated",
      group: "none",
      show: [],
      status: ["active"],
      lifecycle: ["idle", "running", "error", "closed"],
      skillView: "timeline",
    },
    2,
  );
  const values = explorerAgentDisplaySettings.schema.parse(migrated);
  assert.equal(values.rankView, "timeline");
  assert.equal("skillView" in values, false);
});
