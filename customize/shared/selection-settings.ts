import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";
import { PROVIDER_IDS } from "./providers.ts";

/** Host-scoped board selection; null means the project has not been chosen yet. */
export const selectionSettings = defineSettings({
  id: "board-selection",
  scope: "host",
  version: 1,
  schema: z.object({
    provider: z.enum(PROVIDER_IDS).default("claude"),
    projectRoot: z.string().nullable().default(null),
  }),
});
