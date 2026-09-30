import assert from "node:assert/strict";
import { test } from "node:test";
import { isPanelMounted, setPanelMounted, watchPanelPresence } from "./panel-visibility.ts";

test("panel presence tracks instances per workspace and notifies on flips only", () => {
  const events: string[] = [];
  const stop = watchPanelPresence((id) => events.push(`${id}:${isPanelMounted(id)}`));
  const a = {};
  const b = {};

  setPanelMounted("w1", a, true);
  setPanelMounted("w1", b, true);
  setPanelMounted("w1", a, false);
  assert.equal(isPanelMounted("w1"), true);
  setPanelMounted("w1", b, false);
  setPanelMounted("w1", b, false);
  assert.equal(isPanelMounted("w1"), false);
  assert.equal(isPanelMounted("w2"), false);
  assert.deepEqual(events, ["w1:true", "w1:false"]);

  stop();
  setPanelMounted("w1", a, true);
  assert.deepEqual(events, ["w1:true", "w1:false"]);
  setPanelMounted("w1", a, false);
});
