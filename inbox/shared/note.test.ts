import assert from "node:assert/strict";
import { test } from "node:test";
import { isEmptyNote, syncNoteText } from "./note.ts";

test("whitespace-only title and body count as empty", () => {
  assert.equal(isEmptyNote(null, ""), true);
  assert.equal(isEmptyNote("  ", "\n\t "), true);
  assert.equal(isEmptyNote("Title", ""), false);
  assert.equal(isEmptyNote(null, "body"), false);
});

test("remote note text updates a clean editor", () => {
  const saved = { title: "old title", body: "old body" };
  const incoming = { title: "new title", body: "new body" };
  assert.deepEqual(syncNoteText({ ...saved }, saved, incoming), incoming);
});

test("remote note text does not replace an unsaved title or body", () => {
  const saved = { title: "title", body: "body" };
  const incoming = { title: "remote title", body: "remote body" };
  assert.equal(syncNoteText({ ...saved, title: "local title" }, saved, incoming), null);
  assert.equal(syncNoteText({ ...saved, body: "local body" }, saved, incoming), null);
});
