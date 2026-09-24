import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

export const MONO_SETTINGS = defineSettings({
  id: "display",
  scope: "host",
  version: 1,
  schema: z.object({
    compactSidebarNav: z.boolean().default(true),
    minimalChrome: z.boolean().default(true),
    hideThinking: z.boolean().default(true),
    hideDictation: z.boolean().default(true),
    hideVoiceMode: z.boolean().default(true),
  }),
});

export type MonoSettings = z.output<typeof MONO_SETTINGS.schema>;

export const DEFAULT_MONO_SETTINGS: MonoSettings = MONO_SETTINGS.schema.parse({});

export const MODEL_VISIBILITY_SETTINGS = defineSettings({
  id: "models",
  scope: "host",
  version: 1,
  schema: z.object({
    hidden: z
      .array(z.object({ provider: z.string().min(1), modelId: z.string().min(1) }))
      .default([]),
  }),
});

export function sameMonoSettings(left: MonoSettings, right: MonoSettings): boolean {
  return (Object.keys(DEFAULT_MONO_SETTINGS) as (keyof MonoSettings)[]).every(
    (key) => left[key] === right[key],
  );
}
