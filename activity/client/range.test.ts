import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fixedWindowFrom, rangeFrom } from "./range.ts";

describe("fixedWindowFrom", () => {
  it("starts at local midnight so 30 days yield 30 buckets including today", () => {
    const now = new Date(2026, 2, 10, 23, 30);
    const start = new Date(fixedWindowFrom(30, now));
    assert.equal(start.getFullYear(), 2026);
    assert.equal(start.getMonth(), 1);
    assert.equal(start.getDate(), 9); // Mar 10 minus 29 days
    assert.equal(start.getHours(), 0);
    assert.equal(start.getMinutes(), 0);
    assert.equal(start.getSeconds(), 0);
    assert.equal(start.getMilliseconds(), 0);
  });

  it("keeps a single day for one-day and degenerate windows", () => {
    const now = new Date(2026, 2, 10, 8, 0);
    for (const days of [1, 0, -5]) {
      const start = new Date(fixedWindowFrom(days, now));
      assert.equal(start.getDate(), 10);
      assert.equal(start.getHours(), 0);
    }
  });

  it("crosses month, year and DST boundaries without drifting", () => {
    assert.equal(new Date(fixedWindowFrom(30, new Date(2026, 0, 5, 12))).getDate(), 7); // Dec 7
    assert.equal(new Date(fixedWindowFrom(30, new Date(2026, 0, 5, 12))).getMonth(), 11);
    const dst = new Date(fixedWindowFrom(30, new Date(2026, 2, 30, 12)));
    assert.equal(dst.getDate(), 1); // Mar 1
    assert.equal(dst.getHours(), 0);
  });
});

describe("rangeFrom", () => {
  it("returns no lower bound for all time and local midnight for today", () => {
    assert.equal(rangeFrom("all"), undefined);
    const today = new Date(rangeFrom("today")!);
    const now = new Date();
    assert.equal(today.getDate(), now.getDate());
    assert.equal(today.getHours(), 0);
  });
});
