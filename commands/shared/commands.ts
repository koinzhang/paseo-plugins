import { formatToggle, parseToggle, splitFirst, TOGGLE_WORDS } from "./parse.ts";
import { formatList, requireOption } from "./resolve-option.ts";
import type { AgentControl } from "./rpc.ts";

export interface SelectOption {
  id: string;
  label: string;
  isDefault?: boolean;
}

export interface ModelOption {
  id: string;
  label: string;
  aliases?: string[];
  isDefault?: boolean;
  thinkingOptions?: SelectOption[];
  defaultThinkingOptionId?: string;
}

export type Feature =
  | { type: "toggle"; id: string; label: string; value: boolean }
  | { type: "select"; id: string; label: string; value: string | null; options: SelectOption[] };

export interface Profile {
  id: string;
  name: string;
  provider: string;
  model?: string;
  modeId?: string;
  thinkingOptionId?: string;
  featureValues?: Record<string, unknown>;
  [key: string]: unknown;
}

/** What a command needs to know about the current agent. Values are effective, not requested. */
export interface AgentState {
  agentId: string;
  provider: string;
  status: string;
  modelId: string | null;
  thinkingOptionId: string | null;
  modeId: string | null;
  models: ModelOption[];
  modes: SelectOption[];
  features: Feature[];
}

export type PickerEntry =
  | {
      id: string;
      title: string;
      current?: boolean;
      disabled?: boolean;
      control?: AgentControl;
      note?: string;
    }
  | { id: string; title: string; items: PickerEntry[] };

export type Plan =
  | { kind: "picker"; title: string; icon: string; items: PickerEntry[] }
  /** `note` is a short message to show after the control succeeds. */
  | { kind: "run"; control: AgentControl; note?: string };

export function findModel(models: readonly ModelOption[], id: string | null): ModelOption | null {
  if (!id) return models.find((model) => model.isDefault) ?? null;
  return models.find((model) => model.id === id || model.aliases?.includes(id)) ?? null;
}

export function defaultThinkingId(model: ModelOption | null): string | null {
  if (!model) return null;
  return (
    model.defaultThinkingOptionId ??
    model.thinkingOptions?.find((option) => option.isDefault)?.id ??
    null
  );
}

export function planModel(args: string, state: AgentState): Plan {
  const { agentId, models } = state;
  if (models.length === 0) throw new Error(`Provider "${state.provider}" exposes no models.`);
  const current = findModel(models, state.modelId);
  if (!args.trim()) {
    return {
      kind: "picker",
      title: "Model",
      icon: "Cpu",
      items: models.map((model) => ({
        id: model.id,
        title: model.label,
        current: model.id === current?.id,
        control: { op: "model", agentId, modelId: model.id },
      })),
    };
  }
  const model = requireOption("model", args, models, { substring: false });
  return { kind: "run", control: { op: "model", agentId, modelId: model.id } };
}

export function planEffort(args: string, state: AgentState): Plan {
  const { agentId } = state;
  const model = findModel(state.models, state.modelId);
  const options = model?.thinkingOptions ?? [];
  if (options.length === 0) {
    const name = model?.label ?? state.modelId ?? state.provider;
    throw new Error(`"${name}" has no thinking effort levels.`);
  }
  if (!args.trim()) {
    const current = state.thinkingOptionId ?? defaultThinkingId(model);
    return {
      kind: "picker",
      title: "Thinking effort",
      icon: "Brain",
      items: options.map((option) => ({
        id: option.id,
        title: option.label,
        current: option.id === current,
        control: { op: "thinking", agentId, thinkingOptionId: option.id },
      })),
    };
  }
  const option = requireOption("effort", args, options);
  return { kind: "run", control: { op: "thinking", agentId, thinkingOptionId: option.id } };
}

export function planMode(args: string, state: AgentState): Plan {
  const { agentId, modes } = state;
  if (modes.length === 0) throw new Error(`Provider "${state.provider}" exposes no modes.`);
  if (!args.trim()) {
    return {
      kind: "picker",
      title: "Mode",
      icon: "ShieldCheck",
      items: modes.map((mode) => ({
        id: mode.id,
        title: mode.label,
        current: mode.id === state.modeId,
        control: { op: "mode", agentId, modeId: mode.id },
      })),
    };
  }
  const mode = requireOption("mode", args, modes);
  return { kind: "run", control: { op: "mode", agentId, modeId: mode.id } };
}

function featureValueEntries(agentId: string, feature: Feature): PickerEntry[] {
  if (feature.type === "toggle") {
    return [true, false].map((value) => ({
      id: formatToggle(value),
      title: value ? "On" : "Off",
      current: feature.value === value,
      control: { op: "feature", agentId, featureId: feature.id, value },
    }));
  }
  return feature.options.map((option) => ({
    id: option.id,
    title: option.label,
    current: option.id === feature.value,
    control: { op: "feature", agentId, featureId: feature.id, value: option.id },
  }));
}

export function formatFeatureValue(feature: Feature): string {
  if (feature.type === "toggle") return formatToggle(feature.value);
  const option = feature.options.find((entry) => entry.id === feature.value);
  return option?.label ?? feature.value ?? "default";
}

export function planFeature(args: string, state: AgentState): Plan {
  const { agentId, features } = state;
  if (features.length === 0) throw new Error(`Provider "${state.provider}" exposes no features.`);
  const { head, rest } = splitFirst(args);
  if (!head) {
    return {
      kind: "picker",
      title: "Features",
      icon: "SlidersHorizontal",
      items: features.map((feature) => ({
        id: feature.id,
        title: `${feature.label}: ${formatFeatureValue(feature)}`,
        items: featureValueEntries(agentId, feature),
      })),
    };
  }
  const feature = requireOption("feature", head, features);
  if (!rest) {
    return {
      kind: "picker",
      title: feature.label,
      icon: "SlidersHorizontal",
      items: featureValueEntries(agentId, feature),
    };
  }
  if (feature.type === "toggle") {
    const value = parseToggle(rest);
    if (value === null) {
      throw new Error(
        `Unknown ${feature.id} value "${rest}".\nAvailable: ${TOGGLE_WORDS.join(", ")}`,
      );
    }
    return { kind: "run", control: { op: "feature", agentId, featureId: feature.id, value } };
  }
  const option = requireOption(`${feature.id} value`, rest, feature.options);
  return {
    kind: "run",
    control: { op: "feature", agentId, featureId: feature.id, value: option.id },
  };
}

const PROFILE_KEYS = new Set([
  "id",
  "name",
  "icon",
  "color",
  "notes",
  "provider",
  "model",
  "modeId",
  "thinkingOptionId",
  "featureValues",
]);

function trimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Builds the runtime subset of a profile. A running agent cannot change
 * provider, and fields the daemon cannot apply at runtime are reported rather
 * than silently dropped.
 */
export function profileControl(
  profile: Profile,
  state: AgentState,
): { control: Extract<AgentControl, { op: "config" }>; ignored: string[] } {
  const provider = trimmed(profile.provider);
  if (provider && provider !== state.provider) {
    throw new Error(
      `Profile "${profile.name}" targets ${provider}; this agent runs ${state.provider}.`,
    );
  }
  const ignored: string[] = [];
  const config: Extract<AgentControl, { op: "config" }>["config"] = {};

  const modelId = trimmed(profile.model);
  let targetModel = findModel(state.models, state.modelId);
  if (modelId) {
    const known = findModel(state.models, modelId);
    if (known || state.models.length === 0) {
      config.modelId = modelId;
      targetModel = known;
    } else {
      ignored.push(`model "${modelId}"`);
    }
  }

  const modeId = trimmed(profile.modeId);
  if (modeId) {
    if (state.modes.some((mode) => mode.id === modeId)) config.modeId = modeId;
    else ignored.push(`mode "${modeId}"`);
  }

  const thinkingId = trimmed(profile.thinkingOptionId);
  if (thinkingId) {
    const options = targetModel?.thinkingOptions;
    if (!options || options.some((option) => option.id === thinkingId)) {
      config.thinkingOptionId = thinkingId;
    } else {
      ignored.push(`effort "${thinkingId}"`);
    }
  }

  const featureValues: Record<string, unknown> = {};
  for (const [id, value] of Object.entries(profile.featureValues ?? {})) {
    if (state.features.some((feature) => feature.id === id)) featureValues[id] = value;
    else ignored.push(`feature "${id}"`);
  }
  if (Object.keys(featureValues).length > 0) config.featureValues = featureValues;

  for (const key of Object.keys(profile)) {
    if (!PROFILE_KEYS.has(key)) ignored.push(key);
  }
  return { control: { op: "config", agentId: state.agentId, config }, ignored };
}

function profileRun(profile: Profile, state: AgentState): Extract<Plan, { kind: "run" }> {
  const { control, ignored } = profileControl(profile, state);
  const skipped = ignored.length > 0 ? ` Ignored: ${formatList(ignored)}.` : "";
  if (Object.keys(control.config).length === 0) {
    throw new Error(`Profile "${profile.name}" has nothing to apply to this agent.${skipped}`);
  }
  return {
    kind: "run",
    control,
    ...(skipped ? { note: `Applied profile "${profile.name}".${skipped}` } : {}),
  };
}

export function planProfile(args: string, state: AgentState, profiles: readonly Profile[]): Plan {
  if (profiles.length === 0) throw new Error("No agent profiles configured.");
  if (!args.trim()) {
    return {
      kind: "picker",
      title: "Profile",
      icon: "Layers",
      items: profiles.map((profile) => {
        const provider = trimmed(profile.provider);
        const title =
          provider && provider !== state.provider ? `${profile.name} (${provider})` : profile.name;
        try {
          const run = profileRun(profile, state);
          return { id: profile.id, title, control: run.control, note: run.note };
        } catch {
          return { id: profile.id, title, disabled: true };
        }
      }),
    };
  }
  const { profile } = requireOption(
    "profile",
    args,
    profiles.map((entry) => ({ id: entry.id, label: entry.name, profile: entry })),
  );
  return profileRun(profile, state);
}

export function planRename(args: string, agentId: string): Plan {
  const title = args.trim();
  if (!title) throw new Error("Usage: /rename <title>");
  return { kind: "run", control: { op: "rename", agentId, title } };
}

export function planCancel(agentId: string, status: string): Plan {
  if (status !== "running") throw new Error(`Nothing to cancel: the agent is ${status}.`);
  return { kind: "run", control: { op: "cancel", agentId } };
}
