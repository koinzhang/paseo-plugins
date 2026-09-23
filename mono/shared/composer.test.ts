import assert from "node:assert/strict";
import { test } from "node:test";
import { VOICE_BUTTON_SELECTORS } from "./composer.ts";

test("voice selectors target dictation (Mic) and voice mode (AudioLines) buttons", () => {
  assert.deepEqual(VOICE_BUTTON_SELECTORS, [
    '[role="button"]:has(path[d="M19 10v2a7 7 0 0 1-14 0v-2"])',
    '[role="button"]:has(path[d="M10 3v18"]):has(path[d="M22 10v3"])',
  ]);
});
