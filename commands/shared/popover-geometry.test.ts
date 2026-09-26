import assert from "node:assert/strict";
import { test } from "node:test";
import { pillRectFromIcon, placePopover, visibleHeight } from "./popover-geometry.ts";

const window = { width: 1200, height: 800 };

test("pillRectFromIcon expands the icon to the composer pill box", () => {
  assert.deepEqual(pillRectFromIcon({ x: 113, y: 700, width: 14, height: 14 }), {
    x: 100,
    y: 691,
    width: 40,
    height: 32,
  });
});

test("opens above the trigger, start-aligned, with the offset", () => {
  const trigger = { x: 100, y: 700, width: 40, height: 32 };
  assert.deepEqual(
    placePopover({ trigger, content: { width: 280, height: 200 }, window, side: "top", offset: 12 }),
    { x: 100, y: 488, placement: "top" },
  );
});

test("flips below only when above is too small and below has more room", () => {
  const trigger = { x: 100, y: 60, width: 40, height: 32 };
  const content = { width: 280, height: 200 };
  assert.equal(placePopover({ trigger, content, window, side: "top", offset: 12 }).placement, "bottom");
  const cramped = { x: 100, y: 60, width: 40, height: 32 };
  const small = { width: 280, height: 50 };
  assert.equal(
    placePopover({ trigger: cramped, content: small, window, side: "top", offset: 12 }).placement,
    "top",
  );
});

test("clamps inside the window edges", () => {
  const trigger = { x: 1100, y: 700, width: 40, height: 32 };
  const result = placePopover({
    trigger,
    content: { width: 280, height: 900 },
    window,
    side: "top",
    offset: 12,
  });
  assert.equal(result.x, 1200 - 280 - 8);
  assert.equal(result.y, 8);
});

test("visibleHeight caps by max height and window", () => {
  assert.equal(visibleHeight(600, 440, 800), 440);
  assert.equal(visibleHeight(300, 440, 800), 300);
  assert.equal(visibleHeight(600, 440, 300), 284);
});
