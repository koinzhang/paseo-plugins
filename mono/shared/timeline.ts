import type { PluginTimelineTransformResult } from "@getpaseo/plugin";

export const HIDE_REASONING_TRANSFORMER_ID = "hide-reasoning";

export function hideReasoning(): PluginTimelineTransformResult {
  return { items: [] };
}
