import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

/** Host-scoped composer pill visibility settings. */
export const activitySettings = defineSettings({
  id: "activity",
  scope: "host",
  version: 1,
  schema: z.object({
    hideUsagePill: z.boolean().default(false),
    hideAttentionPill: z.boolean().default(false),
  }),
});

export type ActivitySettings = z.infer<typeof activitySettings.schema>;

export const ACTIVITY_SETTINGS_DEFAULTS: ActivitySettings = activitySettings.schema.parse({});

export function sameActivitySettings(
  left: ActivitySettings,
  right: ActivitySettings,
): boolean {
  return left.hideUsagePill === right.hideUsagePill &&
    left.hideAttentionPill === right.hideAttentionPill;
}
