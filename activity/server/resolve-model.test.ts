import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeModelId } from "./resolve-model.ts";

test("normalizeModelId trims and rejects blanks", () => {
  assert.equal(normalizeModelId(" gpt-5.4 "), "gpt-5.4");
  assert.equal(normalizeModelId(""), null);
  assert.equal(normalizeModelId("   "), null);
  assert.equal(normalizeModelId(null), null);
  assert.equal(normalizeModelId(12), null);
});
