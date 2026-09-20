import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { creationBarColor, mixColor } from "./color-mix.ts";

describe("creationBarColor (057)", () => {
  const surface = "#1a1a1c";
  const accent = "#6d49b5";

  it("returns surface for empty or zero max", () => {
    assert.equal(creationBarColor(0, 10, surface, accent), surface);
    assert.equal(creationBarColor(5, 0, surface, accent), surface);
  });

  it("uses a deeper accent mix for the window peak than a small day", () => {
    const peak = creationBarColor(20, 20, surface, accent);
    const low = creationBarColor(1, 20, surface, accent);
    assert.equal(peak, mixColor(surface, accent, 1));
    assert.notEqual(peak, low);
    assert.notEqual(low, surface);
  });

  it("stays in the accent family (no provider brand)", () => {
    const mid = creationBarColor(5, 20, surface, accent);
    assert.match(mid, /^rgb\(/);
    assert.ok(!mid.toLowerCase().includes("d94816"));
  });
});
