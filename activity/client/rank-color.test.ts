import assert from "node:assert/strict";
import { test } from "node:test";
import { entityColor } from "./rank-color.ts";

const ACCENT = "#20744a";

test("entityColor is stable for the same key", () => {
  assert.equal(entityColor("github", ACCENT), entityColor("github", ACCENT));
});

test("entityColor spreads keys across distinct colors", () => {
  const keys = [
    "github",
    "playwright",
    "context7",
    "linear",
    "notion",
    "sentry",
    "figma",
    "slack",
  ];
  const colors = new Set(keys.map((key) => entityColor(key, ACCENT)));
  assert.ok(colors.size >= 6, `expected >= 6 distinct colors, got ${colors.size}`);
});

test("entityColor returns hex and falls back to non-hex accents", () => {
  assert.match(entityColor("github", ACCENT), /^#[0-9a-f]{6}$/);
  assert.equal(entityColor("github", "rgb(32, 116, 74)"), "rgb(32, 116, 74)");
});

test("entityColor adds saturation when the theme accent is near-gray", () => {
  const color = entityColor("github", "#e4e4e7");
  assert.notEqual(color, "#e4e4e7");
  assert.match(color, /^#[0-9a-f]{6}$/);
});
