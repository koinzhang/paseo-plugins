import assert from "node:assert/strict";
import test from "node:test";
import { resolveCategory, visibleCategories } from "../shared/category-visibility.ts";
import { CATEGORIES } from "../shared/contracts.ts";

test("hides categories without verified provider support", () => {
  assert.deepEqual(visibleCategories("cursor"), [...CATEGORIES]);
  assert.deepEqual(visibleCategories("pi"), ["instructions", "skills", "commands", "plugins"]);
  assert.equal(visibleCategories("gemini").includes("rules"), false);
  assert.equal(visibleCategories("kiro").includes("commands"), false);
  assert.equal(visibleCategories("kimi").includes("rules"), false);
});

test("keeps confirmed capabilities visible when their local scan is incomplete", () => {
  assert.equal(visibleCategories("cline").includes("commands"), true);
  assert.equal(visibleCategories("kilo").includes("plugins"), true);
  assert.equal(visibleCategories("traecli").includes("plugins"), true);
  assert.equal(visibleCategories("copilot").includes("subagents"), true);
  assert.equal(visibleCategories("opencode").includes("plugins"), true);
});

test("selects a visible category when switching providers", () => {
  assert.equal(resolveCategory("pi", "mcp"), "instructions");
  assert.equal(resolveCategory("kiro", "commands"), "instructions");
  assert.equal(resolveCategory("cursor", "commands"), "commands");
});
