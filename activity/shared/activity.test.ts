import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { activityLevel, buildActivityCalendar, computeStreaks } from "./activity.ts";

const days = [
  { date: "2026-03-07", skills: 2, mcp: 1, agents: 2, messages: 4, total: 9 },
  { date: "2026-03-09", skills: 1, mcp: 4, agents: 1, messages: 3, total: 9 },
];
const today = new Date(2026, 2, 10);
const from = new Date(2026, 2, 7).toISOString();

describe("activity calendar", () => {
  it("formats months with the explicit app language", () => {
    const english = buildActivityCalendar([], "daily", from, today, "en");
    const chinese = buildActivityCalendar([], "daily", from, today, "zh-CN");
    assert.equal(english.months.length, 12);
    assert.equal(english.months[11]?.label, "Mar");
    assert.equal(chinese.months[11]?.label, "3月");
  });
  it("uses 12 evenly spaced month labels for a year window", () => {
    const result = buildActivityCalendar([], "daily", undefined, new Date(2026, 8, 19), "en");
    assert.equal(result.weeks.length, 52);
    assert.equal(result.months.length, 12);
    assert.equal(result.months[0]?.label, "Oct");
    assert.equal(result.months[11]?.label, "Sep");
    assert.equal(result.months[0]?.index, 0);
    assert.equal(result.months[11]?.index, (11 / 12) * result.weeks.length);
    for (let i = 0; i < 12; i++) {
      assert.equal(result.months[i]?.index, (i / 12) * result.weeks.length);
    }
  });
  it("keeps the year window at a fixed 52 weeks", () => {
    for (const day of [1, 15, 28]) {
      for (const month of [0, 5, 8, 11]) {
        const result = buildActivityCalendar([], "daily", undefined, new Date(2026, month, day), "en");
        assert.equal(result.weeks.length, 52, `2026-${month + 1}-${day}`);
      }
    }
  });
  it("keeps 52-week layout even when a short range from is passed (021)", () => {
    const short = buildActivityCalendar([], "daily", from, today, "en");
    const all = buildActivityCalendar([], "daily", undefined, today, "en");
    assert.equal(short.weeks.length, 52);
    assert.equal(short.months.length, 12);
    assert.equal(short.weeks.length, all.weeks.length);
    assert.equal(short.months.length, all.months.length);
  });
  it("carries cumulative counts across missing days including today", () => {
    const cells = buildActivityCalendar(days, "cumulative", from, today).weeks.flat();
    assert.equal(cells.find(c => c.key === "2026-03-08")?.total, 9);
    assert.equal(cells.find(c => c.key === "2026-03-08")?.agents, 2);
    assert.equal(cells.find(c => c.key === "2026-03-10")?.total, 18);
    assert.equal(cells.find(c => c.key === "2026-03-10")?.agents, 3);
    assert.equal(cells.find(c => c.key === "2026-03-10")?.messages, 7);
  });
  it("keeps daily gaps empty and aggregates Sunday-start weeks", () => {
    assert.equal(buildActivityCalendar(days, "daily", from, today).weeks.flat().find(c => c.key === "2026-03-08")?.total, 0);
    const weekStart = "2026-03-08"; // Sunday containing 2026-03-09
    const weeklyCell = buildActivityCalendar(days, "weekly", from, today)
      .weeks.flat()
      .find((c) => c.key === weekStart);
    assert.equal(weeklyCell?.total, 9);
    assert.equal(weeklyCell?.agents, 1);
    assert.equal(weeklyCell?.messages, 3);
  });
  it("keeps complete rolling windows across day, month, year, leap day and DST boundaries", () => {
    const previous = process.env.TZ;
    process.env.TZ = "America/New_York";
    try {
      for (const [year, month, day] of [
        [2026, 8, 19], [2026, 8, 20], [2026, 8, 21], // Saturday → Sunday → Monday
        [2026, 8, 30], [2026, 9, 1],
        [2026, 11, 31], [2027, 0, 1],
        [2024, 1, 29], [2024, 2, 1],
        [2026, 2, 8], [2026, 2, 9], [2026, 10, 1], [2026, 10, 2],
      ]) {
        const end = new Date(year!, month!, day!);
        for (const mode of ["daily", "weekly", "cumulative"] as const) {
          const result = buildActivityCalendar(days, mode, undefined, end);
          const cells = result.weeks.flat();
          assert.equal(result.weeks.length, 52);
          assert.ok(result.weeks.every(week => week.length === 7));
          assert.equal(new Set(cells.map(cell => cell.key)).size, 364);
          assert.ok(cells.every(cell => !cell.future && !cell.excluded));
          const expected = new Date(end);
          for (let i = cells.length - 1; i >= 0; i--) {
            const key = `${expected.getFullYear()}-${String(expected.getMonth() + 1).padStart(2, "0")}-${String(expected.getDate()).padStart(2, "0")}`;
            assert.equal(cells[i]?.key, key);
            expected.setDate(expected.getDate() - 1);
          }
        }
      }
    } finally {
      if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous;
    }
  });
  it("keeps natural-week totals when Sunday falls inside a visual column", () => {
    const result = buildActivityCalendar(days, "weekly", from, today);
    const last = result.weeks[51]!;
    assert.equal(last[0]?.key, "2026-03-04");
    assert.equal(last.find(cell => cell.key === "2026-03-07")?.agents, 2);
    assert.equal(last.find(cell => cell.key === "2026-03-08")?.agents, 1);
    assert.equal(last[6]?.messages, 3);
  });
  it("carries history before the rolling window into cumulative totals", () => {
    const history = [{ date: "2020-01-01", skills: 1, mcp: 2, agents: 3, messages: 4, total: 10 }, ...days];
    const cells = buildActivityCalendar(history, "cumulative", undefined, today).weeks.flat();
    assert.equal(cells[0]?.total, 10);
    assert.equal(cells[363]?.total, 28);
  });
  it("renders empty windows and bounded intensity", () => {
    const result = buildActivityCalendar([], "daily", undefined, today);
    assert.equal(result.weeks.length, 52);
    assert.equal(result.max, 0);
    assert.equal(activityLevel(0, 100), 0);
    assert.equal(activityLevel(1, 100), 1);
    assert.equal(activityLevel(100, 100), 4);
  });
  it("allows yesterday as the current streak endpoint", () => {
    assert.deepEqual(computeStreaks(days, today), { current: 1, longest: 1 });
  });
  it("counts message-only and agent-only days toward streaks", () => {
    const messageOnly = [
      { date: "2026-03-09", skills: 0, mcp: 0, agents: 0, messages: 2, total: 0 },
      { date: "2026-03-10", skills: 0, mcp: 0, agents: 1, messages: 0, total: 0 },
    ];
    assert.deepEqual(computeStreaks(messageOnly, today), { current: 2, longest: 2 });
  });
});
