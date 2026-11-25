import assert from "node:assert/strict";
import { test } from "node:test";
import { shouldSelectFirstItem } from "./default-selection.ts";

test("global initial empty selection opens the first loaded item", () => {
  assert.equal(shouldSelectFirstItem({ globalSurface: true, selection: null, firstItemId: "first", isPlaceholderData: false }), true);
});

test("an existing item or draft is not replaced", () => {
  assert.equal(shouldSelectFirstItem({ globalSurface: true, selection: { id: "chosen" }, firstItemId: "first", isPlaceholderData: false }), false);
  assert.equal(shouldSelectFirstItem({ globalSurface: true, selection: { id: null }, firstItemId: "first", isPlaceholderData: false }), false);
});

test("workspace, placeholder and empty results do not auto-select", () => {
  assert.equal(shouldSelectFirstItem({ globalSurface: false, selection: null, firstItemId: "first", isPlaceholderData: false }), false);
  assert.equal(shouldSelectFirstItem({ globalSurface: true, selection: null, firstItemId: "previous", isPlaceholderData: true }), false);
  assert.equal(shouldSelectFirstItem({ globalSurface: true, selection: null, firstItemId: undefined, isPlaceholderData: false }), false);
});
