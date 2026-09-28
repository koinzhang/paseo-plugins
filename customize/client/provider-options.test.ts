import assert from "node:assert/strict";
import { test } from "node:test";
import { enabledProviderOptions, selectedProvider } from "./provider-options.ts";

test("only enabled providers with Customize scanners appear, including unavailable ones", () => {
  const options = enabledProviderOptions([
    { provider: "claude", enabled: false, source: "builtin" },
    { provider: "codex", enabled: true, source: "builtin", label: "My Codex" },
    { provider: "cursor", enabled: true, source: "custom", label: "Cursor" },
    { provider: "pi", enabled: true, source: "builtin" },
    { provider: "gemini", enabled: true, source: "custom" },
  ], "Built-in");

  assert.deepEqual(options, [
    { id: "codex", label: "My Codex", badge: "Built-in", group: "builtin" },
    { id: "pi", label: "Pi", badge: "Built-in", group: "builtin" },
    { id: "cursor", label: "Cursor", badge: "ACP", group: "acp" },
    { id: "gemini", label: "Gemini CLI", badge: "ACP", group: "acp" },
  ]);
  assert.equal(selectedProvider("claude", options), "codex");
  assert.equal(selectedProvider("cursor", options), "cursor");
  assert.equal(selectedProvider("claude", []), null);
});

test("snapshot duplicates and older source omissions keep one option", () => {
  const options = enabledProviderOptions([
    { provider: "cursor", enabled: true },
    { provider: "cursor", enabled: true, source: "custom" },
  ], "内置");
  assert.deepEqual(options, [{ id: "cursor", label: "Cursor", badge: "ACP", group: "acp" }]);
});

test("each group sorts by display name, built-ins before ACP", () => {
  const options = enabledProviderOptions([
    { provider: "pi", enabled: true, source: "builtin", label: "zeta" },
    { provider: "codex", enabled: true, source: "builtin", label: "Alpha" },
    { provider: "gemini", enabled: true, source: "custom", label: "beta" },
    { provider: "cursor", enabled: true, source: "custom", label: "Gamma" },
  ], "Built-in");
  assert.deepEqual(options.map((option) => option.label), ["Alpha", "zeta", "beta", "Gamma"]);
  assert.deepEqual(options.map((option) => option.group), ["builtin", "builtin", "acp", "acp"]);
});
