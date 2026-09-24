import assert from "node:assert/strict";
import { test } from "node:test";
import { isChangesRepositoryToolbarEmpty } from "./changes-toolbar.ts";

function toolbar(textContent: string, actions = 0) {
  return { textContent, querySelectorAll: () => Array(actions) };
}

test("hides only a repository toolbar without text or actions", () => {
  assert.equal(isChangesRepositoryToolbarEmpty(toolbar("  \n ")), true);
  assert.equal(isChangesRepositoryToolbarEmpty(toolbar("main")), false);
  assert.equal(isChangesRepositoryToolbarEmpty(toolbar("#123")), false);
  assert.equal(isChangesRepositoryToolbarEmpty(toolbar("", 1)), false);
});
