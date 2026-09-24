import assert from "node:assert/strict";
import { test } from "node:test";
import { MONO_THEMES } from "./palette.ts";

const HEX = /^#[0-9a-f]{6}$/i;

function rgb(hex: string): { r: number; g: number; b: number } {
  const n = Number.parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function isNeutral(hex: string): boolean {
  const { r, g, b } = rgb(hex);
  return r === g && g === b;
}

test("theme ids are unique and cover both appearances", () => {
  const ids = MONO_THEMES.map((theme) => theme.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(MONO_THEMES.map((theme) => theme.appearance).sort(), ["dark", "light"]);
});

test("accent matches foreground so chrome stays ink-colored", () => {
  for (const theme of MONO_THEMES) {
    assert.equal(theme.colors.accent, theme.colors.foreground, theme.id);
  }
});

test("every theme color is a neutral gray hex", () => {
  for (const theme of MONO_THEMES) {
    for (const [key, value] of Object.entries(theme.colors)) {
      assert.match(value, HEX, `${theme.id}.${key}`);
      assert.ok(isNeutral(value), `${theme.id}.${key} is not neutral gray: ${value}`);
    }
  }
});
