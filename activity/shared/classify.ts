import { z } from "zod";

export const CategorySchema = z.enum(["skill", "mcp", "regular"]);
export type Category = z.infer<typeof CategorySchema>;

export const ConfidenceSchema = z.enum(["exact", "inferred", "low"]);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const ClassifyResultSchema = z.object({
  category: CategorySchema,
  confidence: ConfidenceSchema.nullable(),
  detailType: z.string().nullable(),
  skillName: z.string().nullable(),
  mcpServer: z.string().nullable(),
  mcpTool: z.string().nullable(),
  command: z.string().nullable(),
  filePath: z.string().nullable(),
});
export type ClassifyResult = z.infer<typeof ClassifyResultSchema>;

/** Well-known agent config dir names hosting `<dir>/skills/<name>/SKILL.md`. */
export const AGENT_SKILL_CONFIG_DIRS: readonly string[] = [
  "claude",
  "codex",
  "cursor",
  "agents",
  "opencode",
  "pi",
  "codebuddy",
  "openclaw",
  "tcodex",
  "workbuddy",
  "gemini",
  "windsurf",
  "continue",
  "copilot",
  "amp",
  "goose",
  "aider",
  "factory",
  "kilocode",
  "roo",
  "cline",
];

/** Extra roots that do not follow `~/.{name}/skills` / `.{name}/skills`. */
const EXTRA_SKILL_ROOTS: readonly string[] = [
  "~/.config/opencode/skills",
  "~/.pi/agent/skills",
  "~/.codex/vendor_imports/skills",
  "~/.paseo/plugins/*/checkout/*/skills",
  "~/.paseo/plugins/*/skills",
  ".pi/agent/skills",
  ".github/skills",
];

function buildDefaultSkillRoots(): string[] {
  const roots: string[] = [];
  for (const dir of AGENT_SKILL_CONFIG_DIRS) {
    roots.push(`~/.${dir}/skills`);
    roots.push(`.${dir}/skills`);
  }
  roots.push(...EXTRA_SKILL_ROOTS);
  return roots;
}

/** Default skill-root templates (plan §3.2). `~` expanded via homeDir; relative paths match by suffix. */
export const DEFAULT_SKILL_ROOTS: readonly string[] = buildDefaultSkillRoots();

export interface ToolCallDetailInput {
  type?: unknown;
  [key: string]: unknown;
}

export interface ToolCallInput {
  name: string;
  detail?: ToolCallDetailInput | null;
  metadata?: Record<string, unknown> | null;
}

export interface ClassifyContext {
  /** Raw provider id, e.g. "claude", "claude/opus", "opencode", "codex". */
  provider: string;
  skillRoots?: readonly string[];
  homeDir?: string;
  /** OpenCode MCP server names for `<server>_<tool>` matching. */
  mcpServers?: readonly string[];
}

const ACP_PROVIDERS = new Set(["cursor", "codebuddy", "copilot"]);
const DOTTED_MCP_PROVIDERS = new Set(["codex", "pi"]);
const SHELL_SKILL_READ_PATTERN = /\b(cat|sed|head|bat|grep|rg)\b[\s\S]*SKILL\.md/i;
const SKILL_FILE_NAME = "SKILL.md";

function result(partial: Partial<ClassifyResult> & { category: Category }): ClassifyResult {
  return {
    confidence: null,
    detailType: null,
    skillName: null,
    mcpServer: null,
    mcpTool: null,
    command: null,
    filePath: null,
    ...partial,
  };
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function field(source: { [key: string]: unknown } | null | undefined, key: string): unknown {
  return source ? source[key] : undefined;
}

export function normalizeProvider(provider: string): string {
  const head = (provider.split("/")[0] ?? provider).toLowerCase();
  if (head === "claude" || head.startsWith("claude")) return "claude";
  if (head === "opencode") return "opencode";
  if (head === "codex") return "codex";
  if (head === "pi") return "pi";
  // Oh My Pi is its own Paseo provider (manifest id `omp`), not a Pi alias (071).
  if (head === "omp") return "omp";
  if (head === "cursor") return "cursor";
  if (head === "codebuddy" || head === "codebuddy-code") return "codebuddy";
  return head;
}


function expandHome(path: string, homeDir?: string): string {
  if (homeDir && path.startsWith("~/")) {
    return `${homeDir.replace(/\/+$/, "")}/${path.slice(2)}`;
  }
  return path;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** If filePath is under a skill root as …/<name>/SKILL.md (nested dirs OK), return skill name. */
export function matchSkillFile(
  filePath: string,
  roots: readonly string[] = DEFAULT_SKILL_ROOTS,
  homeDir?: string,
): string | null {
  const normalized = expandHome(filePath, homeDir).replace(/\\/g, "/");
  if (!/\/SKILL\.md$/i.test(normalized)) return null;

  for (const root of roots) {
    const resolved = expandHome(root, homeDir).replace(/\\/g, "/");
    if (resolved.includes("*")) {
      const pattern = new RegExp(
        `^.*${resolved.split("*").map(escapeRegExp).join("[^/]+")}(?:/.*)?/([^/]+)/SKILL\\.md$`,
        "i",
      );
      const match = pattern.exec(normalized);
      if (match?.[1]) return match[1];
      continue;
    }
    const prefix = resolved.endsWith("/") ? resolved : `${resolved}/`;
    let remainder: string | null = null;
    if (prefix.startsWith("/")) {
      if (normalized.startsWith(prefix)) remainder = normalized.slice(prefix.length);
      else if (normalized.toLowerCase().startsWith(prefix.toLowerCase())) {
        remainder = normalized.slice(prefix.length);
      }
    } else {
      const index = normalized.indexOf(`/${prefix}`);
      if (index >= 0) remainder = normalized.slice(index + 1 + prefix.length);
      else if (normalized.startsWith(prefix)) remainder = normalized.slice(prefix.length);
    }
    if (!remainder) continue;
    // Allow category nesting: info/zhihu/SKILL.md → zhihu
    const match = /(?:^|\/)([^/]+)\/SKILL\.md$/i.exec(remainder);
    if (match?.[1]) return match[1];
  }
  return null;
}

function parentSkillNameFromPath(token: string): string | null {
  const match = /(?:^|\/)([^/]+)\/SKILL\.md$/i.exec(token.replace(/\\/g, "/"));
  return match?.[1] ?? null;
}

function matchSkillInCommand(
  command: string,
  roots: readonly string[],
  homeDir?: string,
): { skillName: string; filePath: string } | null {
  if (!SHELL_SKILL_READ_PATTERN.test(command)) return null;
  for (const token of command.split(/[\s|;&()<>'"]+/)) {
    if (!/SKILL\.md$/i.test(token)) continue;
    const skillName =
      matchSkillFile(token, roots, homeDir) ?? parentSkillNameFromPath(token);
    if (skillName) return { skillName, filePath: token };
  }
  return null;
}

function classifySkillExact(item: ToolCallInput, detailType: string): ClassifyResult | null {
  if (item.name !== "Skill" && item.name !== "skill") return null;
  return result({
    category: "skill",
    confidence: "exact",
    detailType,
    skillName: asString(field(item.detail, "label")),
  });
}

function classifyMcp(
  item: ToolCallInput,
  detailType: string,
  provider: string,
  context: ClassifyContext,
): ClassifyResult | null {
  const name = item.name;
  if (name.startsWith("mcp__")) {
    const rest = name.slice("mcp__".length);
    const separator = rest.indexOf("__");
    if (separator > 0 && separator + 2 < rest.length) {
      return result({
        category: "mcp",
        confidence: "exact",
        detailType,
        mcpServer: rest.slice(0, separator),
        mcpTool: rest.slice(separator + 2),
      });
    }
  }

  if (DOTTED_MCP_PROVIDERS.has(provider)) {
    const match = /^([A-Za-z0-9_-]+)\.([A-Za-z0-9_.-]+)$/.exec(name);
    if (match) {
      return result({
        category: "mcp",
        confidence: "exact",
        detailType,
        mcpServer: match[1],
        mcpTool: match[2],
      });
    }
  }

  const underscoreHit = matchUnderscoreMcp(name, context.mcpServers);
  if (underscoreHit && provider === "opencode") {
    return result({
      category: "mcp",
      confidence: "exact",
      detailType,
      mcpServer: underscoreHit.server,
      mcpTool: underscoreHit.tool,
    });
  }

  if (ACP_PROVIDERS.has(provider)) {
    // ACP stores kind in `name` (often "other" for MCP); real id is metadata.title / label.
    const title =
      asString(field(item.metadata, "title")) ?? asString(field(item.detail, "label"));
    const candidates = [title, ACP_GENERIC_NAMES.has(name) ? null : name].filter(
      (v): v is string => typeof v === "string" && v.length > 0,
    );
    for (const candidate of candidates) {
      if (candidate.startsWith("mcp__")) {
        const rest = candidate.slice("mcp__".length);
        const separator = rest.indexOf("__");
        if (separator > 0 && separator + 2 < rest.length) {
          return result({
            category: "mcp",
            confidence: "inferred",
            detailType,
            mcpServer: rest.slice(0, separator),
            mcpTool: rest.slice(separator + 2),
          });
        }
      }
      const dottedMatch = /^([A-Za-z0-9_-]+)\.([A-Za-z0-9_.-]+)$/.exec(candidate);
      if (dottedMatch) {
        return result({
          category: "mcp",
          confidence: "inferred",
          detailType,
          mcpServer: dottedMatch[1],
          mcpTool: dottedMatch[2],
        });
      }
      const prefixHit = matchUnderscoreMcp(candidate, context.mcpServers);
      if (prefixHit) {
        return result({
          category: "mcp",
          confidence: "inferred",
          detailType,
          mcpServer: prefixHit.server,
          mcpTool: prefixHit.tool,
        });
      }
    }
  }
  return null;
}

/** ACP kinds that are not the real tool identity (see acp-agent mapToolSnapshotToTimeline). */
const ACP_GENERIC_NAMES = new Set([
  "other",
  "think",
  "switch_mode",
  "read",
  "edit",
  "delete",
  "search",
  "execute",
  "fetch",
]);

function matchUnderscoreMcp(
  name: string,
  mcpServers: readonly string[] | undefined,
): { server: string; tool: string } | null {
  const servers = [...(mcpServers ?? [])].sort((a, b) => b.length - a.length);
  for (const server of servers) {
    if (name.startsWith(`${server}_`) && name.length > server.length + 1) {
      return { server, tool: name.slice(server.length + 1) };
    }
  }
  return null;
}

/**
 * Classify a tool_call into skill / mcp / regular.
 * Pure function — no Node or React imports.
 */
export function classifyToolCall(item: ToolCallInput, context: ClassifyContext): ClassifyResult {
  const detail = item.detail ?? null;
  const detailType = asString(field(detail, "type")) ?? "unknown";
  const provider = normalizeProvider(context.provider);
  const roots = context.skillRoots ?? DEFAULT_SKILL_ROOTS;

  const skillExact = classifySkillExact(item, detailType);
  if (skillExact) return skillExact;

  const filePath = asString(field(detail, "filePath"));
  if (detailType === "read" && filePath) {
    const skillName = matchSkillFile(filePath, roots, context.homeDir);
    if (skillName) {
      return result({
        category: "skill",
        confidence: "inferred",
        detailType,
        skillName,
        filePath,
      });
    }
  }

  if (detailType === "shell") {
    const command = asString(field(detail, "command"));
    if (command) {
      const hit = matchSkillInCommand(command, roots, context.homeDir);
      if (hit) {
        return result({
          category: "skill",
          confidence: "low",
          detailType,
          skillName: hit.skillName,
          filePath: hit.filePath,
          command,
        });
      }
      return result({ category: "regular", detailType, command });
    }
    return result({ category: "regular", detailType });
  }

  const mcp = classifyMcp(item, detailType, provider, context);
  if (mcp) return mcp;

  return result({ category: "regular", detailType, filePath });
}

/** Alias used by ingest / tests. */
export const classify = classifyToolCall;
