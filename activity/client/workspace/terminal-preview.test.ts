import assert from "node:assert/strict";
import { test } from "node:test";
import { terminalPreviewLines } from "./terminal-preview.ts";

test("terminalPreviewLines trims trailing blank lines", () => {
  assert.deepEqual(terminalPreviewLines(["a", "b", "", "   "], 10), ["a", "b"]);
});

test("terminalPreviewLines keeps the last max lines", () => {
  assert.deepEqual(terminalPreviewLines(["1", "2", "3", "4"], 2), ["3", "4"]);
  assert.deepEqual(terminalPreviewLines(["1", "2", "3"], 0), []);
});

test("terminalPreviewLines handles empty and blank-only output", () => {
  assert.deepEqual(terminalPreviewLines([], 5), []);
  assert.deepEqual(terminalPreviewLines(["", "  "], 5), []);
});
