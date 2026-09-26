import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

/**
 * Agent mutations the plugin SDK does not expose yet. The daemon side forwards
 * each one to the matching native daemon request.
 */
export const AgentControlSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("model"), agentId: z.string(), modelId: z.string() }),
  z.object({ op: z.literal("thinking"), agentId: z.string(), thinkingOptionId: z.string() }),
  z.object({ op: z.literal("mode"), agentId: z.string(), modeId: z.string() }),
  z.object({
    op: z.literal("feature"),
    agentId: z.string(),
    featureId: z.string(),
    value: z.union([z.boolean(), z.string(), z.null()]),
  }),
  z.object({
    op: z.literal("config"),
    agentId: z.string(),
    config: z.object({
      modelId: z.string().optional(),
      modeId: z.string().optional(),
      thinkingOptionId: z.string().optional(),
      featureValues: z.record(z.string(), z.unknown()).optional(),
    }),
  }),
  z.object({ op: z.literal("rename"), agentId: z.string(), title: z.string().min(1) }),
  z.object({ op: z.literal("cancel"), agentId: z.string() }),
]);

export type AgentControl = z.infer<typeof AgentControlSchema>;

export const NoticeSchema = z
  .object({ type: z.enum(["info", "warning", "error"]), message: z.string() })
  .nullable();

export const agentControl = defineRpc({
  name: "commands.agent.control",
  input: AgentControlSchema,
  output: z.object({ notice: NoticeSchema }),
});
