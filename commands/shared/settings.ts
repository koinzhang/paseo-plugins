import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

export const COMMANDS_SETTINGS = defineSettings({
  id: "commands",
  scope: "host",
  version: 1,
  schema: z.object({
    disabled: z.array(z.string()).default([]),
  }),
});

export type CommandsSettings = z.output<typeof COMMANDS_SETTINGS.schema>;
