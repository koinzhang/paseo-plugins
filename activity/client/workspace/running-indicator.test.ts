import assert from "node:assert/strict";
import { test } from "node:test";
import { shouldUseNativeDriver } from "./running-indicator-motion.ts";

test("running ring uses JS animation on web (088)", () => {
  assert.equal(shouldUseNativeDriver("web"), false);
});

test("running ring keeps native animation on iOS", () => {
  assert.equal(shouldUseNativeDriver("ios"), true);
});

test("running ring keeps native animation on Android", () => {
  assert.equal(shouldUseNativeDriver("android"), true);
});
