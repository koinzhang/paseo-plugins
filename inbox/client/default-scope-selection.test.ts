import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultScopeSelection } from "./default-scope-selection.ts";

test("unset scope defaults to every available tag", () => {
  assert.deepEqual(defaultScopeSelection({ selected: null, available: ["repo", "other"], isPlaceholderData: false }), ["repo", "other"]);
  assert.deepEqual(defaultScopeSelection({ selected: null, available: [], isPlaceholderData: false }), []);
});

test("partial or explicitly empty scope and old data are not overwritten", () => {
  assert.deepEqual(defaultScopeSelection({ selected: ["repo"], available: ["repo", "other"], isPlaceholderData: false }), ["repo"]);
  assert.deepEqual(defaultScopeSelection({ selected: [], available: ["repo"], isPlaceholderData: false }), []);
  assert.equal(defaultScopeSelection({ selected: null, available: ["repo"], isPlaceholderData: true }), null);
});
