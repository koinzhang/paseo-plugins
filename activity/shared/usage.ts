import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";
import { CategorySchema, ConfidenceSchema, normalizeProvider } from "./classify.ts";
import { formatDisplayName } from "./format.ts";

export const usageSummaryRpc = defineRpc({
  name: "usage.summary",
  input: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    agentId: z.string().optional(),
    workspaceId: z.string().optional(),
  }),
  output: z.object({
    shellCalls: z.number().int().nonnegative(),
    shellFailures: z.number().int().nonnegative(),
    fileReads: z.number().int().nonnegative(),
    fileWrites: z.number().int().nonnegative(),
    skillCalls: z.object({
      exact: z.number().int().nonnegative(),
      inferred: z.number().int().nonnegative(),
      low: z.number().int().nonnegative(),
    }),
    mcpCalls: z.number().int().nonnegative(),
    mcpFailures: z.number().int().nonnegative(),
    toolCallsByKind: z.record(z.string(), z.number().int().nonnegative()),
    /** User sends in the same filter window (006 / 031). */
    messageCount: z.number().int().nonnegative(),
  }),
});

export const usageListRpc = defineRpc({
  name: "usage.list",
  input: z.object({
    category: CategorySchema.optional(),
    confidence: ConfidenceSchema.optional(),
    skillName: z.string().optional(),
    mcpServer: z.string().optional(),
    agentId: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    limit: z.number().int().positive().max(1000).optional(),
    offset: z.number().int().nonnegative().optional(),
  }),
  output: z.object({
    total: z.number().int().nonnegative(),
    rows: z.array(
      z.object({
        agentId: z.string(),
        callId: z.string(),
        provider: z.string(),
        name: z.string(),
        category: z.string(),
        confidence: z.string().nullable(),
        skillName: z.string().nullable(),
        mcpServer: z.string().nullable(),
        mcpTool: z.string().nullable(),
        command: z.string().nullable(),
        status: z.string().nullable(),
        ts: z.string().nullable(),
        ingestedAt: z.string(),
      }),
    ),
  }),
});

export const SkillByNameItemSchema = z.object({
  skillName: z.string(),
  exact: z.number().int().nonnegative(),
  inferred: z.number().int().nonnegative(),
  low: z.number().int().nonnegative(),
  /** exact + inferred only; low is excluded from call counts. */
  total: z.number().int().nonnegative(),
  lastUsedAt: z.string().nullable(),
  /** Absolute path to SKILL.md when known (from read/shell or resolved). */
  skillPath: z.string().nullable(),
});
export type SkillByNameItem = z.infer<typeof SkillByNameItemSchema>;

export const McpByToolItemSchema = z.object({
  server: z.string(),
  tool: z.string(),
  count: z.number().int().nonnegative(),
  failures: z.number().int().nonnegative(),
  lastUsedAt: z.string().nullable(),
});
export type McpByToolItem = z.infer<typeof McpByToolItemSchema>;

export const ModelByNameItemSchema = z.object({
  model: z.string(),
  count: z.number().int().nonnegative(),
});
export type ModelByNameItem = z.infer<typeof ModelByNameItemSchema>;

export const usageSkillsByNameRpc = defineRpc({
  name: "usage.skills-by-name",
  input: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    agentId: z.string().optional(),
    workspaceId: z.string().optional(),
  }),
  output: z.object({
    items: z.array(SkillByNameItemSchema),
  }),
});

export const usageMcpByToolRpc = defineRpc({
  name: "usage.mcp-by-tool",
  input: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    agentId: z.string().optional(),
    workspaceId: z.string().optional(),
  }),
  output: z.object({
    items: z.array(McpByToolItemSchema),
  }),
});

export const usageExportRpc = defineRpc({
  name: "usage.export",
  input: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    agentId: z.string().optional(),
  }),
  output: z.object({
    markdown: z.string(),
  }),
});

export const usageReadSkillRpc = defineRpc({
  name: "usage.read-skill",
  input: z.object({
    path: z.string().min(1),
  }),
  output: z.object({
    path: z.string(),
    skillName: z.string().nullable(),
    body: z.string(),
  }),
});

const SkillCallsSchema = z.object({
  exact: z.number().int().nonnegative(),
  inferred: z.number().int().nonnegative(),
  low: z.number().int().nonnegative(),
});

export const ProviderUsageItemSchema = z.object({
  provider: z.string(),
  label: z.string(),
  shellCalls: z.number().int().nonnegative(),
  shellFailures: z.number().int().nonnegative(),
  fileReads: z.number().int().nonnegative(),
  fileWrites: z.number().int().nonnegative(),
  skillCalls: SkillCallsSchema,
  skills: z.array(SkillByNameItemSchema),
  mcpCalls: z.number().int().nonnegative(),
  mcpFailures: z.number().int().nonnegative(),
  mcpTools: z.array(McpByToolItemSchema),
  shellTop: z.array(
    z.object({
      command: z.string(),
      count: z.number().int().nonnegative(),
      failures: z.number().int().nonnegative(),
    }),
  ),
  /** Messages-weighted model ranks (015); empty when no stamped models. */
  models: z.array(ModelByNameItemSchema),
  agentCount: z.number().int().nonnegative(),
  /**
   * Agents with ≥1 coding op in-window (019: file write/edit/delete or mutating shell).
   * Empty (created-only) agents are excluded from coding and chat. See 018/019.
   */
  codingAgentCount: z.number().int().nonnegative(),
  /** Active non-coding agents: has message or tool_call, but no coding op. */
  chatAgentCount: z.number().int().nonnegative(),
  /** Distinct non-null workspace_id among agents for this provider (same window). */
  workspaceCount: z.number().int().nonnegative(),
  messageCount: z.number().int().nonnegative(),
  callCount: z.number().int().nonnegative(),
});
export type ProviderUsageItem = z.infer<typeof ProviderUsageItemSchema>;

export const usageByProviderRpc = defineRpc({
  name: "usage.by-provider",
  input: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    workspaceId: z.string().optional(),
  }),
  output: z.object({
    totals: z.object({
      shellCalls: z.number().int().nonnegative(),
      fileReads: z.number().int().nonnegative(),
      fileWrites: z.number().int().nonnegative(),
      skillCalls: SkillCallsSchema,
      mcpCalls: z.number().int().nonnegative(),
      /** Distinct non-null workspace_id across all providers (do not sum per-provider). */
      workspaceCount: z.number().int().nonnegative(),
    }),
    providers: z.array(ProviderUsageItemSchema),
  }),
});

export const AgentUsageItemSchema = z.object({
  agentId: z.string(),
  provider: z.string(),
  /** Registry title; null when unknown. */
  title: z.string().nullable(),
  /** All tool calls (any category). */
  callCount: z.number().int().nonnegative(),
  /** exact + inferred; low excluded (same as UI totals). */
  skillCalls: z.number().int().nonnegative(),
  mcpCalls: z.number().int().nonnegative(),
  shellCalls: z.number().int().nonnegative(),
  fileReads: z.number().int().nonnegative(),
  fileWrites: z.number().int().nonnegative(),
  messageCount: z.number().int().nonnegative(),
  /** 019: at least one coding op in the window. */
  coding: z.boolean(),
  /** Registry creation time; null when the agent is not in the registry. */
  createdAt: z.string().nullable(),
  /** Registry last update time (hook time); null when not in the registry. */
  updatedAt: z.string().nullable(),
  /** Registry archive time; null for active agents (025). */
  archivedAt: z.string().nullable(),
  /** Registry parent session; null for top-level agents (041). */
  parentAgentId: z.string().nullable(),
  /** Latest tool call / message time in the window. */
  lastActivityAt: z.string().nullable(),
});
export type AgentUsageItem = z.infer<typeof AgentUsageItemSchema>;

export const usageAgentsRpc = defineRpc({
  name: "usage.agents",
  input: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    workspaceId: z.string().optional(),
  }),
  output: z.object({
    items: z.array(AgentUsageItemSchema),
  }),
});

/** Unarchive via host `refreshAgent` (CLI: `paseo agent reload`). */
export const usageAgentUnarchiveRpc = defineRpc({
  name: "usage.agent.unarchive",
  input: z.object({
    agentId: z.string().min(1),
  }),
  output: z.object({
    agentId: z.string(),
    ok: z.literal(true),
  }),
});

/** Host paths for display-only formatting (e.g. collapsing `homeDir` to `~`). */
export const usageHostInfoRpc = defineRpc({
  name: "usage.host-info",
  input: z.object({}),
  output: z.object({
    homeDir: z.string(),
  }),
});

const PROVIDER_LABELS: Record<string, string> = {
  claude: "Claude",
  opencode: "OpenCode",
  codex: "Codex",
  pi: "Pi",
  cursor: "Cursor",
  codebuddy: "CodeBuddy",
};

/** Display label for a normalized provider id. */
export function providerLabel(provider: string): string {
  return PROVIDER_LABELS[provider] ?? provider.charAt(0).toUpperCase() + provider.slice(1);
}

function emptySkillCalls() {
  return { exact: 0, inferred: 0, low: 0 };
}

/** Exclusive KPI buckets — see specs/014-shell-file-ops. */
export function isShellCall(row: { category: string; detailType: string | null }): boolean {
  return row.category === "regular" && row.detailType === "shell";
}

export function isFileRead(row: { category: string; detailType: string | null }): boolean {
  return row.category === "regular" && row.detailType === "read";
}

const FILE_WRITE_TYPES = new Set(["write", "edit", "delete"]);

export function isFileWrite(row: { category: string; detailType: string | null }): boolean {
  return (
    row.category === "regular" &&
    row.detailType != null &&
    FILE_WRITE_TYPES.has(row.detailType)
  );
}

/** Common development commands that usually mutate the filesystem (019). */
const MUTATING_SHELL_HEADS = new Set([
  "rm",
  "rmdir",
  "mv",
  "cp",
  "mkdir",
  "touch",
  "chmod",
  "chown",
  "ln",
  "unlink",
  "install",
  "tee",
  "truncate",
  "dd",
  "sed",
  "perl",
  "npm",
  "npx",
  "pnpm",
  "yarn",
  "bun",
  "pip",
  "pip3",
  "poetry",
  "uv",
  "cargo",
  "composer",
  "bundle",
  "make",
  "cmake",
  "ninja",
  "tsc",
  "webpack",
  "vite",
  "esbuild",
  "rollup",
]);

/** git subcommands that typically write objects / worktree / index. */
const GIT_MUTATING_SUBCOMMANDS = new Set([
  "add",
  "commit",
  "checkout",
  "switch",
  "merge",
  "rebase",
  "cherry-pick",
  "stash",
  "clean",
  "reset",
  "restore",
  "mv",
  "rm",
  "pull",
  "push",
  "clone",
  "init",
  "fetch",
  "am",
  "apply",
  "revert",
  "submodule",
  "worktree",
]);

const SHELL_REDIRECT_RE = />|>>|\|\s*tee\b/i;

/** git flags that take a following argument before the subcommand. */
const GIT_VALUE_FLAGS = new Set(["-C", "-c", "--git-dir", "--work-tree"]);

function shellHeadAndRest(command: string): { head: string; tokens: string[] } {
  const tokens = command.trim().split(/\s+/).filter(Boolean);
  const raw = tokens[0] ?? "";
  const head = raw.replace(/^.*\//, "") || raw;
  return { head, tokens };
}

function firstGitSubcommand(tokens: readonly string[]): string | undefined {
  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i]!;
    if (token === "--") {
      return tokens[i + 1];
    }
    if (GIT_VALUE_FLAGS.has(token)) {
      i += 1; // skip flag value
      continue;
    }
    if (token.startsWith("-")) continue;
    return token;
  }
  return undefined;
}

/**
 * Heuristic: shell command likely mutates the filesystem (019).
 * Prefers covering common dev write paths; unknown scripts may under-count.
 */
export function shellLooksMutating(command: string | null | undefined): boolean {
  if (!command?.trim()) return false;
  if (SHELL_REDIRECT_RE.test(command)) return true;

  const { head, tokens } = shellHeadAndRest(command);
  if (!head) return false;

  if (head === "sudo" || head === "doas") {
    const rest = tokens.slice(1).join(" ");
    return rest.length > 0 && shellLooksMutating(rest);
  }

  if (MUTATING_SHELL_HEADS.has(head)) return true;

  if (head === "git") {
    const sub = firstGitSubcommand(tokens);
    return sub != null && GIT_MUTATING_SUBCOMMANDS.has(sub);
  }

  return false;
}

/** Session coding op (019): native file write/edit/delete, or mutating shell. */
export function isCodingOp(row: {
  category: string;
  detailType: string | null;
  command?: string | null;
}): boolean {
  if (isFileWrite(row)) return true;
  return isShellCall(row) && shellLooksMutating(row.command);
}

/** Aggregate tool_calls by normalizeProvider(provider).
 * `agentCount` / `workspaceCount` come from `agents` (created registry), not tool_call distinct ids.
 */
export function aggregateByProvider(
  rows: ReadonlyArray<{
    agentId: string;
    provider: string;
    category: string;
    confidence: string | null;
    skillName: string | null;
    mcpServer: string | null;
    mcpTool: string | null;
    detailType: string | null;
    status: string | null;
    ts: string | null;
    ingestedAt: string;
    filePath?: string | null;
    command?: string | null;
  }>,
  agents: ReadonlyArray<{
    agentId: string;
    provider: string;
    workspaceId?: string | null;
  }> = [],
  messages: ReadonlyArray<{ agentId?: string; provider: string; model?: string | null }> = [],
): {
  totals: {
    shellCalls: number;
    fileReads: number;
    fileWrites: number;
    skillCalls: { exact: number; inferred: number; low: number };
    mcpCalls: number;
    workspaceCount: number;
  };
  providers: ProviderUsageItem[];
} {
  type Acc = Omit<
    ProviderUsageItem,
    | "skills"
    | "mcpTools"
    | "shellTop"
    | "models"
    | "agentCount"
    | "codingAgentCount"
    | "chatAgentCount"
    | "workspaceCount"
  > & {
    agents: Set<string>;
    workspaces: Set<string>;
    skillRows: Array<{
      category: string;
      skillName: string | null;
      confidence: string | null;
      ts: string | null;
      ingestedAt: string;
      filePath?: string | null;
    }>;
    mcpRows: Array<{
      category: string;
      mcpServer: string | null;
      mcpTool: string | null;
      status: string | null;
    }>;
    shellRows: Array<{
      category: string;
      detailType: string | null;
      command: string | null;
      status: string | null;
    }>;
    messageRows: Array<{ model?: string | null }>;
  };
  const map = new Map<string, Acc>();
  const allWorkspaces = new Set<string>();
  const codingAgentIds = new Set<string>();
  const activeAgentIds = new Set<string>();
  const totals = {
    shellCalls: 0,
    fileReads: 0,
    fileWrites: 0,
    skillCalls: emptySkillCalls(),
    mcpCalls: 0,
    workspaceCount: 0,
  };

  function ensure(provider: string): Acc {
    let acc = map.get(provider);
    if (!acc) {
      acc = {
        provider,
        label: providerLabel(provider),
        shellCalls: 0,
        shellFailures: 0,
        fileReads: 0,
        fileWrites: 0,
        skillCalls: emptySkillCalls(),
        mcpCalls: 0,
        mcpFailures: 0,
        callCount: 0,
        messageCount: 0,
        agents: new Set(),
        workspaces: new Set(),
        skillRows: [],
        mcpRows: [],
        shellRows: [],
        messageRows: [],
      };
      map.set(provider, acc);
    }
    return acc;
  }

  for (const row of rows) {
    const provider = normalizeProvider(row.provider);
    const acc = ensure(provider);
    acc.callCount += 1;
    activeAgentIds.add(row.agentId);

    if (row.category === "skill") {
      acc.skillRows.push(row);
      if (row.confidence === "exact") {
        acc.skillCalls.exact += 1;
        totals.skillCalls.exact += 1;
      } else if (row.confidence === "low") {
        acc.skillCalls.low += 1;
        totals.skillCalls.low += 1;
      } else {
        acc.skillCalls.inferred += 1;
        totals.skillCalls.inferred += 1;
      }
    } else if (row.category === "mcp") {
      acc.mcpRows.push(row);
      acc.mcpCalls += 1;
      totals.mcpCalls += 1;
      if (row.status === "failed") acc.mcpFailures += 1;
    }

    if (isShellCall(row)) {
      acc.shellCalls += 1;
      totals.shellCalls += 1;
      if (row.status === "failed") acc.shellFailures += 1;
      acc.shellRows.push({
        category: row.category,
        detailType: row.detailType,
        command: row.command ?? null,
        status: row.status,
      });
    }
    if (isFileRead(row)) {
      acc.fileReads += 1;
      totals.fileReads += 1;
    }
    if (isFileWrite(row)) {
      acc.fileWrites += 1;
      totals.fileWrites += 1;
    }
    if (isCodingOp(row)) {
      codingAgentIds.add(row.agentId);
    }
  }

  for (const agent of agents) {
    const provider = normalizeProvider(agent.provider);
    const acc = ensure(provider);
    acc.agents.add(agent.agentId);
    const workspaceId = agent.workspaceId?.trim();
    if (workspaceId) {
      acc.workspaces.add(workspaceId);
      allWorkspaces.add(workspaceId);
    }
  }

  for (const message of messages) {
    const acc = ensure(normalizeProvider(message.provider));
    acc.messageCount += 1;
    acc.messageRows.push({ model: message.model });
    const agentId = message.agentId?.trim();
    if (agentId) activeAgentIds.add(agentId);
  }

  totals.workspaceCount = allWorkspaces.size;

  const providers = [...map.values()]
    .map(({ agents: agentSet, workspaces, skillRows, mcpRows, shellRows, messageRows, ...rest }) => {
      let codingAgentCount = 0;
      let chatAgentCount = 0;
      for (const id of agentSet) {
        if (codingAgentIds.has(id)) {
          codingAgentCount += 1;
        } else if (activeAgentIds.has(id)) {
          chatAgentCount += 1;
        }
      }
      return {
        ...rest,
        agentCount: agentSet.size,
        codingAgentCount,
        chatAgentCount,
        workspaceCount: workspaces.size,
        skills: aggregateSkillsByName(skillRows),
        mcpTools: aggregateMcpByTool(mcpRows),
        shellTop: aggregateShellTop(shellRows),
        models: aggregateModelsByName(messageRows),
      };
    })
    .sort(
      (a, b) =>
        b.callCount - a.callCount ||
        b.agentCount - a.agentCount ||
        a.provider.localeCompare(b.provider),
    );

  return { totals, providers };
}

/** Aggregate tool_calls + user_messages per agent, enriched with the agents registry (024). */
export function aggregateAgents(
  rows: ReadonlyArray<{
    agentId: string;
    provider: string;
    category: string;
    confidence: string | null;
    detailType: string | null;
    command?: string | null;
    ts: string | null;
    ingestedAt: string;
  }>,
  agents: ReadonlyArray<{
    agentId: string;
    provider: string;
    title?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    archivedAt?: string | null;
    parentAgentId?: string | null;
  }> = [],
  messages: ReadonlyArray<{
    agentId?: string;
    provider: string;
    ts?: string | null;
    ingestedAt?: string;
  }> = [],
): AgentUsageItem[] {
  const map = new Map<string, AgentUsageItem>();

  function ensure(agentId: string, provider: string): AgentUsageItem {
    let acc = map.get(agentId);
    if (!acc) {
      acc = {
        agentId,
        provider: normalizeProvider(provider),
        title: null,
        callCount: 0,
        skillCalls: 0,
        mcpCalls: 0,
        shellCalls: 0,
        fileReads: 0,
        fileWrites: 0,
        messageCount: 0,
        coding: false,
        createdAt: null,
        updatedAt: null,
        archivedAt: null,
        parentAgentId: null,
        lastActivityAt: null,
      };
      map.set(agentId, acc);
    }
    return acc;
  }

  function touch(acc: AgentUsageItem, at: string | null | undefined): void {
    if (at && (!acc.lastActivityAt || at > acc.lastActivityAt)) acc.lastActivityAt = at;
  }

  for (const row of rows) {
    const acc = ensure(row.agentId, row.provider);
    acc.callCount += 1;
    if (row.category === "skill") {
      if (row.confidence !== "low") acc.skillCalls += 1;
    } else if (row.category === "mcp") {
      acc.mcpCalls += 1;
    }
    if (isShellCall(row)) acc.shellCalls += 1;
    if (isFileRead(row)) acc.fileReads += 1;
    if (isFileWrite(row)) acc.fileWrites += 1;
    if (isCodingOp(row)) acc.coding = true;
    touch(acc, row.ts ?? row.ingestedAt);
  }

  for (const agent of agents) {
    const acc = ensure(agent.agentId, agent.provider);
    acc.title = agent.title?.trim() || acc.title;
    acc.createdAt = agent.createdAt ?? acc.createdAt;
    acc.updatedAt = agent.updatedAt ?? acc.updatedAt;
    acc.archivedAt = agent.archivedAt ?? acc.archivedAt;
    if (agent.parentAgentId !== undefined) {
      acc.parentAgentId = agent.parentAgentId?.trim() || null;
    }
  }

  for (const message of messages) {
    const agentId = message.agentId?.trim();
    if (!agentId) continue;
    const acc = ensure(agentId, message.provider);
    acc.messageCount += 1;
    touch(acc, message.ts ?? message.ingestedAt);
  }

  return [...map.values()].sort(
    (a, b) =>
      b.callCount + b.messageCount - (a.callCount + a.messageCount) ||
      (b.lastActivityAt ?? "").localeCompare(a.lastActivityAt ?? "") ||
      (a.title ?? a.agentId).localeCompare(b.title ?? b.agentId),
  );
}

/** Aggregate user messages by model id (015). Null/blank models are skipped. */
export function aggregateModelsByName(
  messages: ReadonlyArray<{ model?: string | null }>,
): ModelByNameItem[] {
  const map = new Map<string, number>();
  for (const message of messages) {
    const model = message.model?.trim();
    if (!model) continue;
    map.set(model, (map.get(model) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([model, count]) => ({ model, count }))
    .sort((a, b) => b.count - a.count || a.model.localeCompare(b.model));
}

/** Prefer a concrete SKILL.md path over a non-md path or empty. */
export function preferSkillPath(
  current: string | null | undefined,
  candidate: string | null | undefined,
): string | null {
  if (!candidate?.trim()) return current ?? null;
  const next = candidate.trim();
  if (!current) return next;
  const currentIsSkillMd = /SKILL\.md$/i.test(current);
  const nextIsSkillMd = /SKILL\.md$/i.test(next);
  if (nextIsSkillMd && !currentIsSkillMd) return next;
  return current;
}

/** Aggregate skill rows by skillName. `total` = exact + inferred only (low excluded). */
export function aggregateSkillsByName(
  rows: ReadonlyArray<{
    category: string;
    skillName: string | null;
    confidence: string | null;
    ts: string | null;
    ingestedAt: string;
    filePath?: string | null;
  }>,
): SkillByNameItem[] {
  const map = new Map<string, SkillByNameItem>();
  for (const row of rows) {
    if (row.category !== "skill") continue;
    const name = row.skillName?.trim();
    if (!name) continue;
    let item = map.get(name);
    if (!item) {
      item = {
        skillName: name,
        exact: 0,
        inferred: 0,
        low: 0,
        total: 0,
        lastUsedAt: null,
        skillPath: null,
      };
      map.set(name, item);
    }
    if (row.confidence === "exact") {
      item.exact += 1;
      item.total += 1;
    } else if (row.confidence === "low") {
      item.low += 1;
      // low is tracked but not counted in total / call counts
    } else {
      item.inferred += 1;
      item.total += 1;
    }
    const at = row.ts ?? row.ingestedAt;
    if (!item.lastUsedAt || at > item.lastUsedAt) item.lastUsedAt = at;
    item.skillPath = preferSkillPath(item.skillPath, row.filePath);
  }
  return [...map.values()].sort(
    (a, b) => b.total - a.total || a.skillName.localeCompare(b.skillName),
  );
}

/** First token of a shell command for top-command grouping. */
export function shellCommandHead(command: string): string {
  const trimmed = command.trim();
  if (!trimmed) return "(empty)";
  const token = trimmed.split(/\s+/)[0] ?? "(empty)";
  return token.replace(/^.*\//, "") || token;
}

export function aggregateShellTop(
  rows: ReadonlyArray<{
    category?: string;
    detailType: string | null;
    command: string | null;
    status: string | null;
  }>,
  limit = 20,
): Array<{ command: string; count: number; failures: number }> {
  const map = new Map<string, { count: number; failures: number }>();
  for (const row of rows) {
    if (row.category != null) {
      if (!isShellCall({ category: row.category, detailType: row.detailType })) continue;
    } else if (row.detailType !== "shell") {
      continue;
    }
    if (!row.command) continue;
    const head = shellCommandHead(row.command);
    const cur = map.get(head) ?? { count: 0, failures: 0 };
    cur.count += 1;
    if (row.status === "failed") cur.failures += 1;
    map.set(head, cur);
  }
  return [...map.entries()]
    .map(([command, v]) => ({ command, count: v.count, failures: v.failures }))
    .sort((a, b) => b.count - a.count || a.command.localeCompare(b.command))
    .slice(0, limit);
}

export function aggregateMcpByTool(
  rows: ReadonlyArray<{
    category: string;
    mcpServer: string | null;
    mcpTool: string | null;
    status: string | null;
    ts?: string | null;
    ingestedAt?: string;
  }>,
): McpByToolItem[] {
  const map = new Map<string, McpByToolItem>();
  for (const row of rows) {
    if (row.category !== "mcp") continue;
    const server = row.mcpServer ?? "(unknown)";
    const tool = row.mcpTool ?? "(unknown)";
    const key = `${server}\0${tool}`;
    const cur = map.get(key) ?? {
      server,
      tool,
      count: 0,
      failures: 0,
      lastUsedAt: null,
    };
    cur.count += 1;
    if (row.status === "failed") cur.failures += 1;
    const at = row.ts ?? row.ingestedAt ?? null;
    if (at && (!cur.lastUsedAt || at > cur.lastUsedAt)) cur.lastUsedAt = at;
    map.set(key, cur);
  }
  return [...map.values()].sort(
    (a, b) =>
      b.count - a.count || a.server.localeCompare(b.server) || a.tool.localeCompare(b.tool),
  );
}

/** Format pill label: most recently used skill or MCP; no ×n; `Name + N` when entity count > 1. */
export function formatUsagePillLabel(
  _summary: { shellCalls?: number } | undefined,
  skills: ReadonlyArray<{
    skillName: string;
    total: number;
    lastUsedAt?: string | null;
  }> = [],
  mcpTools: ReadonlyArray<{
    server: string;
    tool: string;
    count: number;
    lastUsedAt?: string | null;
  }> = [],
): string {
  type Candidate = {
    kind: "skill" | "mcp";
    key: string;
    label: string;
    lastUsedAt: string;
  };
  const candidates: Candidate[] = [];
  for (const skill of skills) {
    if (skill.total <= 0) continue;
    candidates.push({
      kind: "skill",
      key: skill.skillName,
      label: formatDisplayName(skill.skillName),
      lastUsedAt: skill.lastUsedAt ?? "",
    });
  }
  for (const mcp of mcpTools) {
    if (mcp.count <= 0) continue;
    const key = `${mcp.server}.${mcp.tool}`;
    candidates.push({
      kind: "mcp",
      key,
      label: formatDisplayName(key),
      lastUsedAt: mcp.lastUsedAt ?? "",
    });
  }
  if (candidates.length === 0) return "";
  candidates.sort((a, b) => {
    if (a.lastUsedAt !== b.lastUsedAt) return b.lastUsedAt.localeCompare(a.lastUsedAt);
    if (a.kind !== b.kind) return a.kind === "skill" ? -1 : 1;
    return a.key.localeCompare(b.key);
  });
  const top = candidates[0]!;
  const extra = candidates.length - 1;
  return extra > 0 ? `${top.label} + ${extra}` : top.label;
}

export const ActivityDaySchema = z.object({
  /** Local calendar day `YYYY-MM-DD`. */
  date: z.string(),
  skills: z.number().int().nonnegative(),
  mcp: z.number().int().nonnegative(),
  /** Distinct agents created that local day (005 registry). */
  agents: z.number().int().nonnegative(),
  messages: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});
export type ActivityDay = z.infer<typeof ActivityDaySchema>;

export const usageActivityByDayRpc = defineRpc({
  name: "usage.activity-by-day",
  input: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    /** Normalized provider id; omit / empty = all providers. */
    provider: z.string().optional(),
    workspaceId: z.string().optional(),
  }),
  output: z.object({
    days: z.array(ActivityDaySchema),
  }),
});

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** Local calendar day key for an ISO timestamp. */
export function localDayKey(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/**
 * Bucket skill / MCP calls by local day; agents = creations that day.
 * Skill counts exclude `confidence=low` (same as UI totals).
 * `total` = skills + mcp + agents + messages (heatmap intensity).
 */
export function aggregateActivityByDay(
  rows: ReadonlyArray<{
    agentId: string;
    provider: string;
    category: string;
    confidence: string | null;
    ts: string | null;
    ingestedAt: string;
  }>,
  opts: {
    provider?: string;
    /** Created agents; `agents` on each day counts these by createdAt local day. */
    agents?: ReadonlyArray<{ agentId: string; provider: string; createdAt: string }>;
    messages?: ReadonlyArray<{ provider: string; ts: string | null; ingestedAt: string }>;
  } = {},
): ActivityDay[] {
  const map = new Map<string, { skills: number; mcp: number; agents: number; messages: number }>();
  const providerFilter = opts.provider?.trim() ? normalizeProvider(opts.provider) : undefined;

  for (const row of rows) {
    if (providerFilter && normalizeProvider(row.provider) !== providerFilter) continue;
    if (row.category !== "skill" && row.category !== "mcp") continue;
    if (row.category === "skill" && row.confidence === "low") continue;

    const key = localDayKey(row.ts ?? row.ingestedAt);
    if (!key) continue;
    const bucket = map.get(key) ?? { skills: 0, mcp: 0, agents: 0, messages: 0 };
    if (row.category === "skill") bucket.skills += 1;
    else bucket.mcp += 1;
    map.set(key, bucket);
  }

  for (const agent of opts.agents ?? []) {
    if (providerFilter && normalizeProvider(agent.provider) !== providerFilter) continue;
    const key = localDayKey(agent.createdAt);
    if (!key) continue;
    const bucket = map.get(key) ?? { skills: 0, mcp: 0, agents: 0, messages: 0 };
    bucket.agents += 1;
    map.set(key, bucket);
  }

  for (const message of opts.messages ?? []) {
    if (providerFilter && normalizeProvider(message.provider) !== providerFilter) continue;
    const key = localDayKey(message.ts ?? message.ingestedAt);
    if (!key) continue;
    const bucket = map.get(key) ?? { skills: 0, mcp: 0, agents: 0, messages: 0 };
    bucket.messages += 1;
    map.set(key, bucket);
  }

  return [...map.entries()]
    .map(([date, counts]) => ({
      date,
      skills: counts.skills,
      mcp: counts.mcp,
      agents: counts.agents,
      messages: counts.messages,
      total: counts.skills + counts.mcp + counts.agents + counts.messages,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

