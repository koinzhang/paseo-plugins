import assert from "node:assert/strict";
import { test } from "node:test";
import {
  hiddenModelsCss,
  isModelHidden,
  modelRowSelector,
  providerIdsByTitle,
  setModelHidden,
} from "./models.ts";

const opus = { provider: "claude", modelId: "opus" };
const gpt = { provider: "codex", modelId: "gpt-5" };

test("hiding is keyed by provider and model", () => {
  const hidden = setModelHidden([], opus, true);
  assert.equal(isModelHidden(hidden, opus), true);
  assert.equal(isModelHidden(hidden, { provider: "other", modelId: "opus" }), false);
});

test("setModelHidden adds once and removes", () => {
  const twice = setModelHidden(setModelHidden([], opus, true), opus, true);
  assert.deepEqual(twice, [opus]);
  assert.deepEqual(setModelHidden([opus, gpt], opus, false), [gpt]);
});

test("row selector matches the model browser testID and escapes quotes", () => {
  assert.equal(modelRowSelector(opus), '[data-testid="model-row-claude-opus"]');
  assert.equal(
    modelRowSelector({ provider: "p", modelId: 'a"b\\c' }),
    '[data-testid="model-row-p-a\\"b\\\\c"]',
  );
});

test("css hides each row and its direct wrapper", () => {
  assert.equal(hiddenModelsCss([]), "");
  const css = hiddenModelsCss([opus]);
  assert.match(css, /^\[data-testid="model-row-claude-opus"\],\n:has\(> \[data-testid="model-row-claude-opus"\]\) \{/);
  assert.match(css, /display: none !important;/);
});

test("provider titles fall back to id and drop ambiguous labels", () => {
  const map = providerIdsByTitle([
    { provider: "claude", label: "Claude" },
    { provider: "codex" },
    { provider: "a", label: "Same" },
    { provider: "b", label: "Same" },
    { provider: "c", label: "Same" },
  ]);
  assert.equal(map.get("Claude"), "claude");
  assert.equal(map.get("codex"), "codex");
  assert.equal(map.has("Same"), false);
});
