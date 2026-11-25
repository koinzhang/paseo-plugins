import type { DaemonClient } from "@getpaseo/client/internal/daemon-client";
import { createPaseoApi, type PaseoAgentHandle } from "@getpaseo/client";
import { assertSupportedOptions } from "../shared/agent-options.ts";
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
    case "feature": {
      const options = { [input.featureId]: input.value };
      await withSupportedOptions(client, agentId, options, (agent) => agent.setOptions(options));
      return { notice: null };
    }
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
  if (client.getLastServerInfoMessage()?.features?.agentConfigApply !== true) {
    throw new Error("Update the host to apply an agent profile as one config bundle.");
  }
  if (config.options && Object.keys(config.options).length > 0) {
    return withSupportedOptions(client, agentId, config.options, () =>
      client.applyAgentConfig(agentId, config),
    );
  }
  return client.applyAgentConfig(agentId, config);
}

async function withSupportedOptions<Result>(
  client: DaemonClient,
  agentId: string,
  options: Record<string, unknown>,
  run: (agent: PaseoAgentHandle) => Promise<Result>,
): Promise<Result> {
  const paseo = createPaseoApi(client);
  try {
    const agent = paseo.agents.ref(agentId);
    const result = await agent.refresh();
    if (!result?.agent) throw new Error("Agent not found.");
    assertSupportedOptions(result.agent, options);
    return await run(agent);
  } finally {
    await paseo.dispose();
  }
}
