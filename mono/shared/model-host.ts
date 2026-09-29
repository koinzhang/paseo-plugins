import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const modelVisibilityHostRpc = defineRpc({
  name: "models.host",
  input: z.object({}),
  output: z.object({ serverId: z.string().min(1) }),
});
