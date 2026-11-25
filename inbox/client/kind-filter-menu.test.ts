import assert from "node:assert/strict";
import { test } from "node:test";
import { toggleInboxKind, toggleInboxSelection } from "./kind-filter.ts";

test("Agents and Notes start selected and toggle independently", () => {
  assert.deepEqual(toggleInboxKind(["agent", "note"], "agent"), ["note"]);
  assert.deepEqual(toggleInboxKind(["note"], "agent"), ["note", "agent"]);
  assert.deepEqual(toggleInboxKind(["note"], "note"), []);
});

test("Projects and Workspaces toggle independently without an All option", () => {
  assert.deepEqual(toggleInboxSelection([], "repo"), ["repo"]);
  assert.deepEqual(toggleInboxSelection(["repo"], "second"), ["repo", "second"]);
  assert.deepEqual(toggleInboxSelection(["repo", "second"], "repo"), ["second"]);
  assert.deepEqual(toggleInboxSelection(["repo"], "repo"), []);
});
