import assert from "node:assert/strict";
import { test } from "node:test";
import { mcpServerColor } from "./rank-color.ts";

const ACCENT = "#20744a";

test("mcpServerColor is stable for the same server", () => {
  assert.equal(mcpServerColor("github", ACCENT), mcpServerColor("github", ACCENT));
});

test("mcpServerColor spreads servers across distinct colors", () => {
  const servers = [
    "github",
    "playwright",
    "context7",
    "linear",
    "notion",
    "sentry",
    "figma",
    "slack",
  ];
  const colors = new Set(servers.map((server) => mcpServerColor(server, ACCENT)));
  assert.ok(colors.size >= 6, `expected >= 6 distinct colors, got ${colors.size}`);
});

test("mcpServerColor returns hex and falls back to non-hex accents", () => {
  assert.match(mcpServerColor("github", ACCENT), /^#[0-9a-f]{6}$/);
  assert.equal(mcpServerColor("github", "rgb(32, 116, 74)"), "rgb(32, 116, 74)");
});

test("mcpServerColor adds saturation when the theme accent is near-gray", () => {
  const color = mcpServerColor("github", "#e4e4e7");
  assert.notEqual(color, "#e4e4e7");
  assert.match(color, /^#[0-9a-f]{6}$/);
});
