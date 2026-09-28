import assert from "node:assert/strict";
import { test } from "node:test";
import { cardWidth, gridColumns, GRID } from "./grid.ts";

test("gridColumns: 1 column narrow, up to maxColumns wide", () => {
  assert.equal(gridColumns(0), 1);
  assert.equal(gridColumns(491), 1); // 2 columns need 2 * 240 + 12 = 492
  assert.equal(gridColumns(492), 2);
  assert.equal(gridColumns(743), 2); // 3 columns need 3 * 240 + 2 * 12 = 744
  assert.equal(gridColumns(744), 3);
  assert.equal(gridColumns(1_600), GRID.maxColumns);
});

test("cardWidth: splits the row minus gaps; undefined before measurement", () => {
  assert.equal(cardWidth(0, 1), undefined);
  assert.equal(cardWidth(492, 2), GRID.minCardWidth);
  assert.equal(cardWidth(744, 3), GRID.minCardWidth);
  assert.equal(cardWidth(1_000, 3), (1_000 - GRID.gap * 2) / 3);
});
