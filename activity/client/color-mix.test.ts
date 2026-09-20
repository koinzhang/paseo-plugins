import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  creationDayFill,
  significantCreationSlices,
} from "./color-mix.ts";

const colorOf = (provider: string) =>
  ({
    cursor: "#d94816",
    opencode: "#88a0ff",
    codex: "#5b9fd4",
    claude: "#d97757",
  }[provider] ?? "#888");

describe("significantCreationSlices (055)", () => {
  it("drops a tiny middle slice that would notch the gradient", () => {
    // Sep 10 shape: Codex 6 / OpenCode 1 / Cursor 24 (top→bottom stack order).
    const kept = significantCreationSlices([
      { provider: "codex", count: 6 },
      { provider: "opencode", count: 1 },
      { provider: "cursor", count: 24 },
    ]);
    assert.deepEqual(
      kept.map((slice) => slice.provider),
      ["codex", "cursor"],
    );
  });

  it("keeps every slice when each is substantial", () => {
    const kept = significantCreationSlices([
      { provider: "claude", count: 4 },
      { provider: "cursor", count: 4 },
      { provider: "codex", count: 4 },
    ]);
    assert.equal(kept.length, 3);
  });

  it("always keeps the day's largest even when below the share floor", () => {
    const kept = significantCreationSlices([
      { provider: "cursor", count: 1 },
      { provider: "opencode", count: 1 },
      { provider: "codex", count: 1 },
    ]);
    // All tied for peak → all kept (then capped at maxColors=3).
    assert.equal(kept.length, 3);
  });
});

describe("creationDayFill (055)", () => {
  it("returns empty for no slices", () => {
    assert.deepEqual(creationDayFill([], colorOf, "#accent"), { type: "empty" });
  });

  it("uses solid fill for a single provider", () => {
    assert.deepEqual(
      creationDayFill([{ provider: "cursor", count: 3 }], colorOf, "#accent"),
      { type: "solid", color: "#d94816" },
    );
  });

  it("blends significant colours evenly and skips tiny middle seams", () => {
    const fill = creationDayFill(
      [
        { provider: "codex", count: 6 },
        { provider: "opencode", count: 1 },
        { provider: "cursor", count: 24 },
      ],
      colorOf,
      "#accent",
    );
    assert.deepEqual(fill, {
      type: "gradient",
      image: "linear-gradient(to bottom, #5b9fd4, #d94816)",
    });
  });

  it("falls back to solid when only one colour survives the filter", () => {
    const fill = creationDayFill(
      [
        { provider: "cursor", count: 20 },
        { provider: "opencode", count: 1 },
      ],
      colorOf,
      "#accent",
    );
    assert.deepEqual(fill, { type: "solid", color: "#d94816" });
  });
});
