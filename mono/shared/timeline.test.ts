import assert from "node:assert/strict";
import { test } from "node:test";
import { hideReasoning } from "./timeline.ts";

test("reasoning items are removed from the timeline", () => {
  assert.deepEqual(hideReasoning(), { items: [] });
});
