import type { ProviderId } from "./providers.ts";

/** Providers with verified shared or foreign skill search roots. */
export const COMPATIBLE_PROVIDERS = new Set<ProviderId>([
  "cursor", "copilot", "opencode", "pi", "omp", "gemini", "goose", "grok", "kilo", "kimi",
]);
