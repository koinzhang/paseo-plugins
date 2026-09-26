import type { PluginAgentCommandContext } from "@getpaseo/plugin/client";
import type { AgentState, Feature, ModelOption, Profile, SelectOption } from "../shared/commands.ts";

type Paseo = PluginAgentCommandContext["paseo"];

export interface LoadNeeds {
  models?: boolean;
  modes?: boolean;
}

function toSelectOption(option: { id: string; label: string; isDefault?: boolean }): SelectOption {
  return { id: option.id, label: option.label, isDefault: option.isDefault };
}

/** Reads the live agent snapshot and, when asked, the provider catalogs it depends on. */
export async function loadAgentState(
  paseo: Paseo,
  agentId: string,
  needs: LoadNeeds = {},
): Promise<AgentState> {
  const result = await paseo.agents.ref(agentId).refresh();
  const agent = result?.agent;
  if (!agent) throw new Error("Agent not found.");

  let models: ModelOption[] = [];
  if (needs.models) {
    const catalog = await paseo.providers.listModels(agent.provider, { cwd: agent.cwd });
    if (!catalog.models?.length && catalog.error) throw new Error(catalog.error);
    models = (catalog.models ?? [])
      .filter((model) => model.isSelectable !== false)
      .map((model) => ({
        id: model.id,
        label: model.label,
        aliases: model.aliases,
        isDefault: model.isDefault,
        thinkingOptions: model.thinkingOptions?.map(toSelectOption),
        defaultThinkingOptionId: model.defaultThinkingOptionId,
      }));
  }

  let modes: SelectOption[] = agent.availableModes.map(toSelectOption);
  if (needs.modes && modes.length === 0) {
    const catalog = await paseo.providers.listModes(agent.provider, { cwd: agent.cwd });
    modes = (catalog.modes ?? []).map(toSelectOption);
  }

  const features: Feature[] = (agent.features ?? []).map((feature) =>
    feature.type === "toggle"
      ? { type: "toggle", id: feature.id, label: feature.label, value: feature.value }
      : {
          type: "select",
          id: feature.id,
          label: feature.label,
          value: feature.value,
          options: feature.options.map(toSelectOption),
        },
  );

  return {
    agentId: agent.id,
    provider: agent.provider,
    status: agent.status,
    modelId: agent.model ?? agent.runtimeInfo?.model ?? null,
    thinkingOptionId:
      agent.effectiveThinkingOptionId ??
      agent.thinkingOptionId ??
      agent.runtimeInfo?.thinkingOptionId ??
      null,
    modeId: agent.currentModeId ?? agent.runtimeInfo?.modeId ?? null,
    models,
    modes,
    features,
  };
}

export async function loadProfiles(paseo: Paseo): Promise<Profile[]> {
  const { config } = await paseo.config.get();
  return (config.agentProfiles ?? []) as Profile[];
}
