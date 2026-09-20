import assert from "node:assert/strict";
import { test } from "node:test";
import {
  chartColorScheme,
  creationProviderColors,
  entityColor,
  knownProviderSlotCount,
  providerColor,
} from "./rank-color.ts";

const LIGHT_SURFACE = "#f4f4f5";
const DARK_SURFACE = "#18181b";

test("chartColorScheme reads light vs dark from surface luminance", () => {
  assert.equal(chartColorScheme(LIGHT_SURFACE), "light");
  assert.equal(chartColorScheme(DARK_SURFACE), "dark");
  assert.equal(chartColorScheme("not-a-color"), "dark");
});

test("providerColor is stable and switches with scheme", () => {
  assert.equal(providerColor("claude", "light"), providerColor("claude", "light"));
  assert.equal(providerColor("claude/opus", "dark"), providerColor("claude", "dark"));
  assert.notEqual(providerColor("claude", "light"), providerColor("claude", "dark"));
  assert.match(providerColor("claude", "light"), /^#[0-9a-f]{6}$/i);
});

test("providerColor covers known Paseo providers without falling through", () => {
  const known = [
    "claude",
    "codex",
    "cursor",
    "opencode",
    "pi",
    "omp",
    "copilot",
    "gemini",
    "codebuddy-code",
    "devin",
    "hermes",
    "kiro",
  ];
  for (const id of known) {
    assert.match(providerColor(id, "light"), /^#[0-9a-f]{6}$/i);
  }
  assert.equal(providerColor("codebuddy-code", "dark"), providerColor("codebuddy", "dark"));
  assert.ok(knownProviderSlotCount() >= 40, `expected many slots, got ${knownProviderSlotCount()}`);
});

test("entityColor hashes MCP keys into the soft palette", () => {
  assert.equal(entityColor("github", "light"), entityColor("github", "light"));
  assert.notEqual(entityColor("github", "light"), entityColor("github", "dark"));
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
  const colors = new Set(keys.map((key) => entityColor(key, "light")));
  assert.ok(colors.size >= 6, `expected >= 6 distinct colors, got ${colors.size}`);
});

test("providerColor uses brand accents for Claude / Codex / Cursor / OpenCode / Pi / Oh My Pi", () => {
  assert.equal(providerColor("claude", "light"), "#d97757");
  assert.equal(providerColor("claude", "dark"), "#c46845");
  assert.equal(providerColor("codex", "light"), "#4d9eef");
  assert.equal(providerColor("codex", "dark"), "#0169cc");
  assert.equal(providerColor("cursor", "light"), "#f54e00");
  assert.equal(providerColor("cursor", "dark"), "#b83900");
  assert.equal(providerColor("opencode", "light"), "#74a2ec");
  assert.equal(providerColor("opencode", "dark"), "#5a86d4");
  assert.equal(providerColor("pi", "light"), "#f1be58");
  assert.equal(providerColor("pi", "dark"), "#4d9abf");
  assert.equal(providerColor("omp", "light"), "#9a90f5");
  assert.equal(providerColor("omp", "dark"), "#7f73f2");
  assert.equal(providerColor("copilot", "light"), "#5fed83");
  assert.equal(providerColor("copilot", "dark"), "#077124");
  assert.notEqual(providerColor("omp", "light"), providerColor("pi", "light"));
  assert.notEqual(providerColor("claude", "light"), providerColor("claude", "dark"));
});

test("creationProviderColors keeps brand colours even for the window leader", () => {
  const map = creationProviderColors(["claude", "codex", "cursor"], "#ff00aa", "light");
  assert.equal(map.get("claude"), providerColor("claude", "light"));
  assert.equal(map.get("codex"), providerColor("codex", "light"));
  assert.equal(map.get("cursor"), providerColor("cursor", "light"));
  assert.notEqual(map.get("claude"), "#ff00aa");
});

test("creationProviderColors uses accent only when the leader has no brand colour", () => {
  const map = creationProviderColors(["gemini", "claude", "codex"], "#ff00aa", "light");
  assert.equal(map.get("gemini"), "#ff00aa");
  assert.equal(map.get("claude"), providerColor("claude", "light"));
  assert.equal(map.get("codex"), providerColor("codex", "light"));
});

test("creationProviderColors with a single branded provider keeps the brand", () => {
  const map = creationProviderColors(["pi"], "#112233", "dark");
  assert.equal(map.get("pi"), providerColor("pi", "dark"));
  assert.equal(map.size, 1);
});

test("creationProviderColors with a single unbranded provider uses accent", () => {
  const map = creationProviderColors(["gemini"], "#112233", "dark");
  assert.equal(map.get("gemini"), "#112233");
  assert.equal(map.size, 1);
});
