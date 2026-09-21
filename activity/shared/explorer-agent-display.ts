import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

export function migrateExplorerAgentDisplay(values: unknown, fromVersion: number): unknown {
  if (
    fromVersion < 3 &&
    values !== null &&
    typeof values === "object" &&
    !Array.isArray(values)
  ) {
    const { skillView, ...rest } = values as Record<string, unknown>;
    return {
      ...rest,
      rankView: skillView === "timeline" ? "timeline" : "ranked",
    };
  }
  return values;
}

/** Host-scoped Explorer display prefs (Agents menu + shared Skills/MCP view). */
export const explorerAgentDisplaySettings = defineSettings({
  id: "explorer-agent-display",
  scope: "host",
  version: 3,
  schema: z.object({
    sort: z.enum(["created", "updated", "name", "messages", "status"]).default("updated"),
    group: z.enum(["none", "provider", "status"]).default("none"),
    show: z.array(z.enum(["provider", "calls", "messages", "updated", "prompt"])).default([]),
    status: z.array(z.enum(["active", "archived"])).default(["active"]),
    lifecycle: z
      .array(z.enum(["idle", "running", "error", "closed"]))
      .default(["idle", "running", "error", "closed"]),
    rankView: z.enum(["ranked", "timeline"]).default("ranked"),
  }),
  migrate: migrateExplorerAgentDisplay,
});

export type ExplorerAgentDisplayValues = z.infer<
  typeof explorerAgentDisplaySettings.schema
>;

export const EXPLORER_AGENT_DISPLAY_DEFAULTS: ExplorerAgentDisplayValues = {
  sort: "updated",
  group: "none",
  show: [],
  status: ["active"],
  lifecycle: ["idle", "running", "error", "closed"],
  rankView: "ranked",
};
