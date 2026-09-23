import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DICTATION_BUTTON_SELECTOR,
  VOICE_MODE_BUTTON_SELECTOR,
  hiddenVoiceButtonSelectors,
} from "./composer.ts";

test("voice selectors target dictation (Mic) and voice mode (AudioLines) buttons", () => {
  assert.equal(DICTATION_BUTTON_SELECTOR, '[role="button"]:has(path[d="M19 10v2a7 7 0 0 1-14 0v-2"])');
  assert.equal(
    VOICE_MODE_BUTTON_SELECTOR,
    '[role="button"]:has(path[d="M10 3v18"]):has(path[d="M22 10v3"])',
  );
});

test("hidden selectors follow each setting independently", () => {
  assert.deepEqual(hiddenVoiceButtonSelectors({ hideDictation: true, hideVoiceMode: true }), [
    DICTATION_BUTTON_SELECTOR,
    VOICE_MODE_BUTTON_SELECTOR,
  ]);
  assert.deepEqual(hiddenVoiceButtonSelectors({ hideDictation: false, hideVoiceMode: true }), [
    VOICE_MODE_BUTTON_SELECTOR,
  ]);
  assert.deepEqual(hiddenVoiceButtonSelectors({ hideDictation: true, hideVoiceMode: false }), [
    DICTATION_BUTTON_SELECTOR,
  ]);
  assert.deepEqual(hiddenVoiceButtonSelectors({ hideDictation: false, hideVoiceMode: false }), []);
});
