import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";
import { PROVIDER_IDS } from "./providers.ts";

export const CATEGORIES = ["instructions", "rules", "skills", "mcp", "commands", "subagents", "plugins"] as const;
export type Category = (typeof CATEGORIES)[number];

export const SCOPES = ["project", "user"] as const;
export type Scope = (typeof SCOPES)[number];

export const STATUSES = ["auto", "conditional", "manual", "pending", "disabled", "inactive"] as const;
export type Status = (typeof STATUSES)[number];

export const REASON_CODES = [
  "frontmatter",
  "config",
  "shadowedBy",
  "nestedDir",
  "globs",
  "agentDecides",
  "manualMention",
  "always",
  "untrusted",
  "needsApproval",
  "offByDefault",
  "ignoredExt",
  "env",
  "oversize",
  "onDemand",
] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

export const TAGS = [
  "managed",
  "system",
  "builtin",
  "legacy",
  "deprecated",
  "nested",
  "parent",
  "command",
  "symlink",
  "local",
  "trust",
  "systemPrompt",
  "appendPrompt",
  "sticky",
  "userInvocableOff",
  "nameOnly",
  "ask",
  "url",
  "autolearn",
  "synced",
] as const;
export type Tag = (typeof TAGS)[number];

export const EntrySchema = z.object({
  id: z.string(),
  category: z.enum(CATEGORIES),
  scope: z.enum(SCOPES),
  name: z.string(),
  description: z.string().optional(),
  path: z.string(),
  dir: z.string(),
  source: z.string(),
  status: z.enum(STATUSES),
  reason: z.object({ code: z.enum(REASON_CODES), value: z.string().optional() }).optional(),
  tags: z.array(z.enum(TAGS)),
  agentPlugin: z.object({ version: z.string(), validation: z.enum(["valid", "unsupported"]) }).optional(),
  mcp: z.object({ name: z.string(), transport: z.string(), target: z.string() }).optional(),
});
export type Entry = z.infer<typeof EntrySchema>;

const ProviderIdSchema = z.enum(PROVIDER_IDS);

export const CompatibilitySchema = z.object({ enabled: z.boolean().nullable(), source: z.string() });
export type Compatibility = z.infer<typeof CompatibilitySchema>;

export const scanRpc = defineRpc({
  name: "customize.scan",
  input: z.object({ provider: ProviderIdSchema, projectRoot: z.string().nullable() }),
  output: z.object({
    provider: ProviderIdSchema,
    projectRoot: z.string().nullable(),
    home: z.string(),
    entries: z.array(EntrySchema),
    compatibility: CompatibilitySchema.nullable(),
    scannedAt: z.string(),
  }),
});
export type ScanResult = z.infer<typeof scanRpc.output>;

export const cachedScanRpc = defineRpc({
  name: "customize.cached-scan",
  input: scanRpc.input,
  output: z.object({ snapshot: scanRpc.output.nullable(), stale: z.boolean() }),
});

export const previewRpc = defineRpc({
  name: "customize.preview",
  input: z.object({ path: z.string(), mcpName: z.string().optional() }),
  output: z.object({
    path: z.string(),
    kind: z.enum(["text", "mcp", "directory", "missing"]),
    content: z.string(),
    truncated: z.boolean(),
    bytes: z.number(),
  }),
});
export type PreviewResult = z.infer<typeof previewRpc.output>;

export const openRpc = defineRpc({
  name: "customize.open",
  input: z.object({ path: z.string(), reveal: z.boolean().optional() }),
  output: z.object({ ok: z.literal(true) }),
});
