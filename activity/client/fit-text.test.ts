import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fitFontSize } from "./fit-text.ts";

const options = { base: 18, min: 12 };
const measured = (size: number, width: number) => ({ size, width });

describe("fitFontSize (051)", () => {
  it("keeps the base size when the text fits", () => {
    assert.equal(fitFontSize(measured(18, 80), 100, options), 18);
    assert.equal(fitFontSize(measured(18, 100), 100, options), 18);
    assert.equal(fitFontSize(measured(12, 60), 120, options), 18);
  });

  it("scales the size down by the measured overflow", () => {
    // 138px at 18px in a 120px tile → 15.5px (1% headroom).
    assert.equal(fitFontSize(measured(18, 138), 120, options), 15.5);
  });

  it("is independent of the size the text is currently rendered at", () => {
    // The same physical width measured at 15.5px resolves to the same size.
    const shrunk = fitFontSize(measured(15.5, 138 * (15.5 / 18)), 120, options);
    assert.equal(shrunk, 15.5);
  });

  it("grows back to base once the tile widens", () => {
    assert.equal(fitFontSize(measured(15.5, 118.8), 160, options), 18);
  });

  it("clamps to min and ignores unusable measurements", () => {
    assert.equal(fitFontSize(measured(18, 400), 60, options), 12);
    assert.equal(fitFontSize(measured(18, 0), 120, options), 18);
    assert.equal(fitFontSize(measured(0, 120), 120, options), 18);
    assert.equal(fitFontSize(measured(18, 138), 0, options), 18);
  });

  it("derives a min floor from the base size when none is given", () => {
    assert.equal(fitFontSize(measured(18, 400), 40, { base: 18 }), 12);
    assert.equal(fitFontSize(measured(12, 400), 40, { base: 12 }), 8);
  });
});
