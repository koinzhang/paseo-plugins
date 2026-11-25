import { defineSubscription } from "@getpaseo/plugin";
import { z } from "zod";

export const InboxChange = z.object({ type: z.literal("invalidate") }).strict();
export type InboxChange = z.infer<typeof InboxChange>;

export const itemsChanged = defineSubscription({
  name: "items.changes",
  input: z.object({}),
  event: InboxChange,
});
