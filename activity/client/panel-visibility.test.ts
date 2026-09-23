import assert from "node:assert/strict";
import { test } from "node:test";
import { isPanelVisible, setPanelVisible, watchPanelVisibility } from "./panel-visibility.ts";

test("panel visibility tracks instances per workspace and notifies on flips only", () => {
  const events: string[] = [];
  const stop = watchPanelVisibility((id) => events.push(`${id}:${isPanelVisible(id)}`));
  const a = {};
  const b = {};

  setPanelVisible("w1", a, true);
  setPanelVisible("w1", b, true);
  setPanelVisible("w1", a, false);
  assert.equal(isPanelVisible("w1"), true);
  setPanelVisible("w1", b, false);
  setPanelVisible("w1", b, false);
  assert.equal(isPanelVisible("w1"), false);
  assert.equal(isPanelVisible("w2"), false);
  assert.deepEqual(events, ["w1:true", "w1:false"]);

  stop();
  setPanelVisible("w1", a, true);
  assert.deepEqual(events, ["w1:true", "w1:false"]);
  setPanelVisible("w1", a, false);
});
