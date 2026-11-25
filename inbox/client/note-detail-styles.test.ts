import assert from "node:assert/strict";
import { test } from "node:test";
import { noteActionOpacity, noteFieldFocusBorder } from "./note-detail-styles.ts";

test("borderless title and body never regain an input focus border", () => {
  assert.equal(noteFieldFocusBorder({ borderless: true, focused: true }), false);
  assert.equal(noteFieldFocusBorder({ borderless: true, focused: false }), false);
});

test("bordered search retains its focus border and disabled actions dim", () => {
  assert.equal(noteFieldFocusBorder({ borderless: false, focused: true }), true);
  assert.equal(noteFieldFocusBorder({ borderless: false, focused: false }), false);
  assert.equal(noteActionOpacity(true), 0.5);
  assert.equal(noteActionOpacity(false), 1);
});
