import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatActivityTime,
  formatDisplayName,
  formatLocalDateTime,
  formatUpdatedAt,
} from "./format.ts";

const NOW = new Date(2026, 8, 18, 15, 30);

describe("formatActivityTime", () => {
  it("shows only the time for the same local day", () => {
    const text = formatActivityTime(new Date(2026, 8, 18, 9, 5).toISOString(), "en", NOW);
    assert.match(text, /9:05/);
    assert.doesNotMatch(text, /Sep/);
    assert.doesNotMatch(text, /18/);
  });

  it("adds month/day for another day in the same year", () => {
    const text = formatActivityTime(new Date(2026, 8, 17, 14, 2).toISOString(), "en", NOW);
    assert.match(text, /Sep/);
    assert.match(text, /17/);
    assert.doesNotMatch(text, /2026/);
  });

  it("includes the year when the date is not this year", () => {
    const text = formatActivityTime(new Date(2025, 11, 31, 23, 59).toISOString(), "en", NOW);
    assert.match(text, /2025/);
    assert.match(text, /Dec/);
  });

  it("returns the placeholder for empty and keeps invalid input", () => {
    assert.equal(formatActivityTime(null, "en", NOW), "—");
    assert.equal(formatActivityTime(undefined, "en", NOW), "—");
    assert.equal(formatActivityTime("not-a-date", "en", NOW), "not-a-date");
  });

  it("keeps formatUpdatedAt as an alias", () => {
    assert.equal(formatUpdatedAt, formatActivityTime);
  });
});

describe("formatLocalDateTime", () => {
  it("defaults to English locale style", () => {
    const text = formatLocalDateTime(new Date(2026, 8, 17, 14, 2).toISOString());
    assert.match(text, /Sep/);
    assert.match(text, /17/);
    assert.match(text, /2026/);
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
