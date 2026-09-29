import assert from "node:assert/strict";
import { test } from "node:test";
import { isEmptyNote } from "./note.ts";

test("whitespace-only title and body count as empty", () => {
  assert.equal(isEmptyNote(null, ""), true);
  assert.equal(isEmptyNote("  ", "\n\t "), true);
  assert.equal(isEmptyNote("Title", ""), false);
  assert.equal(isEmptyNote(null, "body"), false);
});
