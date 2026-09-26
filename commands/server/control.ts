import type { DaemonClient } from "@getpaseo/client/internal/daemon-client";
import type { AgentControl } from "../shared/rpc.ts";

type Notice = { type: "info" | "warning" | "error"; message: string } | null;

export async function runAgentControl(
  client: DaemonClient,
  input: AgentControl,
): Promise<{ notice: Notice }> {
  const { agentId } = input;
  switch (input.op) {
    case "model":
      await client.setAgentModel(agentId, input.modelId);
      return { notice: null };
    case "thinking":
      return { notice: await client.setAgentThinkingOption(agentId, input.thinkingOptionId) };
    case "mode":
      return { notice: await client.setAgentMode(agentId, input.modeId) };
    case "feature":
      await client.setAgentFeature(agentId, input.featureId, input.value);
      return { notice: null };
    case "config":
      return { notice: await applyConfig(client, agentId, input.config) };
    case "rename":
      await client.updateAgent(agentId, { name: input.title });
      return { notice: null };
    case "cancel":
      await client.cancelAgent(agentId);
      return { notice: null };
  }
}

async function applyConfig(
  client: DaemonClient,
  agentId: string,
  config: Extract<AgentControl, { op: "config" }>["config"],
): Promise<Notice> {
  if (client.getLastServerInfoMessage()?.features?.agentConfigApply === true) {
    return client.applyAgentConfig(agentId, config);
  }
  // Older daemons: apply the same bundle one field at a time, model first so
  // thinking options are validated against the new model.
  let notice: Notice = null;
  if (config.modelId) await client.setAgentModel(agentId, config.modelId);
  if (config.modeId) notice = (await client.setAgentMode(agentId, config.modeId)) ?? notice;
  if (config.thinkingOptionId) {
    notice = (await client.setAgentThinkingOption(agentId, config.thinkingOptionId)) ?? notice;
  }
  for (const [featureId, value] of Object.entries(config.featureValues ?? {})) {
    await client.setAgentFeature(agentId, featureId, value);
  }
  return notice;
}
