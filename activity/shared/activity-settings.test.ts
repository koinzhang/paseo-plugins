import assert from "node:assert/strict";
import test from "node:test";
import {
  ACTIVITY_SETTINGS_DEFAULTS,
  activitySettings,
  sameActivitySettings,
} from "./activity-settings.ts";

test("activity settings default to both composer pills visible", () => {
  assert.deepEqual(ACTIVITY_SETTINGS_DEFAULTS, {
    hideUsagePill: false,
    hideAttentionPill: false,
  });
  assert.deepEqual(activitySettings.schema.parse({}), ACTIVITY_SETTINGS_DEFAULTS);
});

test("activity settings keep the two pill switches independent", () => {
  const usageHidden = activitySettings.schema.parse({ hideUsagePill: true });
  const attentionHidden = activitySettings.schema.parse({ hideAttentionPill: true });

  assert.equal(usageHidden.hideUsagePill, true);
  assert.equal(usageHidden.hideAttentionPill, false);
  assert.equal(attentionHidden.hideUsagePill, false);
  assert.equal(attentionHidden.hideAttentionPill, true);
  assert.equal(sameActivitySettings(usageHidden, attentionHidden), false);
  assert.equal(sameActivitySettings(usageHidden, { ...usageHidden }), true);
});
