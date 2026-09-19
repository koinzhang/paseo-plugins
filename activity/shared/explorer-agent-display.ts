import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

/** Host-scoped Explorer Agents menu prefs (Sort / Group / Show / Status / Lifecycle). */
export const explorerAgentDisplaySettings = defineSettings({
  id: "explorer-agent-display",
  scope: "host",
  version: 1,
  schema: z.object({
    sort: z.enum(["created", "updated", "name", "messages", "status"]).default("updated"),
    group: z.enum(["none", "provider", "status"]).default("none"),
    show: z.array(z.enum(["provider", "calls", "messages", "updated"])).default([]),
    status: z.array(z.enum(["active", "archived"])).default(["active"]),
    lifecycle: z
      .array(z.enum(["idle", "running", "error", "closed"]))
      .default(["idle", "running", "error", "closed"]),
  }),
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
};
