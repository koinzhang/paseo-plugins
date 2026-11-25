import type { AgentFeature, AgentOptionControl, ProviderOptions } from "@getpaseo/protocol/agent-types";
import { featuresFromControls } from "@getpaseo/protocol/option-controls";

export interface OptionSource {
  controls?: readonly AgentOptionControl[];
  options?: ProviderOptions;
  features?: readonly AgentFeature[];
}

export function optionFeatures(source: OptionSource): readonly AgentFeature[] {
  if (source.controls !== undefined) {
    return featuresFromControls({ controls: source.controls, options: source.options });
  }
  return source.features ?? [];
}

export function assertSupportedOptions(source: OptionSource, patch: ProviderOptions): void {
  const features = optionFeatures(source);
  for (const key of Object.keys(patch)) {
    if (!features.some((feature) => feature.id === key)) {
      const available = features.map((feature) => feature.id).join(", ") || "none";
      throw new Error(`Unknown option "${key}".\nAvailable: ${available}`);
    }
  }
}
