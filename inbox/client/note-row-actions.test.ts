import assert from "node:assert/strict";
import { test } from "node:test";
import { showsNoteRowActions } from "./note-row-actions.ts";

test("all web rows reveal actions only while hovered or busy", () => {
  assert.equal(showsNoteRowActions({ web: true, hovered: false, busy: false }), false);
  assert.equal(showsNoteRowActions({ web: true, hovered: true, busy: false }), true);
  assert.equal(showsNoteRowActions({ web: true, hovered: false, busy: true }), true);
});

test("mobile rows always show actions", () => {
  const idle = { hovered: false, busy: false };
  assert.equal(showsNoteRowActions({ ...idle, web: false }), true);
});
