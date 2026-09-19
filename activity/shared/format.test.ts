import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatDayTime, formatDisplayName } from "./format.ts";

const NOW = new Date(2026, 8, 18, 15, 30);

describe("formatDayTime", () => {
  it("shows only HH:mm for the same local day", () => {
    assert.equal(formatDayTime(new Date(2026, 8, 18, 9, 5).toISOString(), NOW), "09:05");
    assert.equal(formatDayTime(new Date(2026, 8, 18, 23, 59).toISOString(), NOW), "23:59");
  });

  it("adds MM-DD for another day in the same year", () => {
    assert.equal(formatDayTime(new Date(2026, 8, 17, 14, 2).toISOString(), NOW), "09-17 14:02");
    assert.equal(formatDayTime(new Date(2026, 0, 3, 0, 7).toISOString(), NOW), "01-03 00:07");
  });

  it("adds the year for a different year", () => {
    assert.equal(
      formatDayTime(new Date(2025, 11, 31, 23, 59).toISOString(), NOW),
      "2025-12-31 23:59",
    );
  });

  it("returns the placeholder for empty and keeps invalid input", () => {
    assert.equal(formatDayTime(null, NOW), "—");
    assert.equal(formatDayTime(undefined, NOW), "—");
    assert.equal(formatDayTime("not-a-date", NOW), "not-a-date");
  });
});

describe("formatDisplayName", () => {
  it("replaces - and _ with spaces and title-cases every word", () => {
    assert.equal(formatDisplayName("git-commit-push"), "Git Commit Push");
    assert.equal(formatDisplayName("tapd_search"), "Tapd Search");
    assert.equal(formatDisplayName("knot.tapd_search"), "Knot.Tapd Search");
    assert.equal(formatDisplayName("paseo"), "Paseo");
  });

  it("collapses repeated separators and trims", () => {
    assert.equal(formatDisplayName("__foo--bar_"), "Foo Bar");
  });

  it("keeps an all-separator or empty value unchanged", () => {
    assert.equal(formatDisplayName(""), "");
    assert.equal(formatDisplayName("--"), "--");
  });
});
