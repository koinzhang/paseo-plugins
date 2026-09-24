import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_MONO_SETTINGS,
  MODEL_VISIBILITY_SETTINGS,
  MONO_SETTINGS,
  sameMonoSettings,
} from "./settings.ts";

test("no models are hidden by default", () => {
  assert.deepEqual(MODEL_VISIBILITY_SETTINGS.schema.parse({}), { hidden: [] });
});

test("every tweak is enabled by default", () => {
  assert.deepEqual(DEFAULT_MONO_SETTINGS, {
    compactSidebarNav: true,
    minimalChrome: true,
    hideThinking: true,
    hideDictation: true,
    hideVoiceMode: true,
  });
});

test("each setting is stored independently", () => {
  assert.deepEqual(MONO_SETTINGS.schema.parse({ hideThinking: false, hideDictation: false }), {
    compactSidebarNav: true,
    minimalChrome: true,
    hideThinking: false,
    hideDictation: false,
    hideVoiceMode: true,
  });
});

test("settings equality compares every field", () => {
  assert.equal(sameMonoSettings(DEFAULT_MONO_SETTINGS, { ...DEFAULT_MONO_SETTINGS }), true);
  assert.equal(
    sameMonoSettings(DEFAULT_MONO_SETTINGS, { ...DEFAULT_MONO_SETTINGS, compactSidebarNav: false }),
    false,
  );
});
