import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatActivityTime,
  formatCount,
  formatDisplayName,
  formatDuration,
  formatLocalDateTime,
} from "./format.ts";

const NOW = new Date(2026, 8, 18, 15, 30);

describe("formatActivityTime", () => {
  it("shows only the time for the same local day", () => {
    const text = formatActivityTime(new Date(2026, 8, 18, 9, 5).toISOString(), "en", NOW);
    assert.match(text, /09:05|9:05/);
    assert.doesNotMatch(text, /Sep/);
    assert.doesNotMatch(text, /\bAM\b|\bPM\b/i);
  });

  it("adds month/day for another day in the same year", () => {
    const text = formatActivityTime(new Date(2026, 8, 17, 14, 2).toISOString(), "en", NOW);
    assert.match(text, /Sep/);
    assert.match(text, /17/);
    assert.match(text, /14:02/);
    assert.doesNotMatch(text, /2026/);
    assert.doesNotMatch(text, /\bAM\b|\bPM\b/i);
  });

  it("includes the year when the date is not this year", () => {
    const text = formatActivityTime(new Date(2025, 11, 31, 23, 59).toISOString(), "en", NOW);
    assert.match(text, /2025/);
    assert.match(text, /Dec/);
    assert.match(text, /23:59/);
    assert.doesNotMatch(text, /\bAM\b|\bPM\b/i);
  });

  it("returns the placeholder for empty and keeps invalid input", () => {
    assert.equal(formatActivityTime(null, "en", NOW), "—");
    assert.equal(formatActivityTime(undefined, "en", NOW), "—");
    assert.equal(formatActivityTime("not-a-date", "en", NOW), "not-a-date");
  });
});

describe("formatDuration", () => {
  it("steps through minutes, hours, days and months", () => {
    assert.equal(formatDuration(0), "<1 min");
    assert.equal(formatDuration(59_000), "<1 min");
    assert.equal(formatDuration(59 * 60_000), "59 min");
    assert.equal(formatDuration(3.25 * 3_600_000), "3.3 h");
    assert.equal(formatDuration(47 * 3_600_000), "47 h");
    assert.equal(formatDuration(48 * 3_600_000), "2 days");
    assert.equal(formatDuration(277.7 * 3_600_000), "11.6 days");
    assert.equal(formatDuration(100 * 24 * 3_600_000), "3.3 months");
  });

  it("rejects negative and non-finite input", () => {
    assert.equal(formatDuration(-1), "—");
    assert.equal(formatDuration(Number.NaN), "—");
  });
});

describe("formatCount", () => {
  it("keeps small counts exact and abbreviates k / M", () => {
    assert.equal(formatCount(0), "0");
    assert.equal(formatCount(9999), "9999");
    assert.equal(formatCount(12345), "12.3k");
    assert.equal(formatCount(10000), "10k");
    assert.equal(formatCount(1234567), "1.2M");
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
