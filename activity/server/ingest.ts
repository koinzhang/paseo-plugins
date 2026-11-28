import { createHash } from "node:crypto";
import type { AgentTimelineItem } from "./host-types.ts";
import type { PluginHookAgent } from "@getpaseo/plugin/server";
import { classifyToolCall, DEFAULT_SKILL_ROOTS, type ToolCallInput } from "../shared/classify.ts";
import { nestedSkillCalls } from "../shared/nested-skill-calls.ts";
import { resolveMcpServers } from "./mcp-servers.ts";
import type { ToolCallRow, UserMessageRow, UsageStore } from "./store.ts";
import { createKeyedTtlCache } from "./ttl-cache.ts";
import { readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type IngestClassifyOptions = {
  homeDir?: string;
  skillRoots?: readonly string[];
  mcpServers?: readonly string[];
};

export type IngestTurnOptions = IngestClassifyOptions & {
  store: UsageStore;
  now?: () => string;
  model?: string | null;
};

const pluginSkillRootsCache = createKeyedTtlCache<string[]>(60_000);

// Discover plugin skill dirs under ~/.paseo/plugins (…/checkout/…/skills).
export function discoverPaseoPluginSkillRoots(homeDir: string): string[] {
  return pluginSkillRootsCache.get(homeDir, () => discoverPaseoPluginSkillRootsUncached(homeDir));
}

function discoverPaseoPluginSkillRootsUncached(homeDir: string): string[] {
  const pluginsRoot = join(homeDir, ".paseo", "plugins");
  const roots: string[] = [];

  const tryPush = (path: string) => {
    try {
      if (statSync(path).isDirectory()) roots.push(path);
    } catch {
      /* skip */
    }
  };

  try {
    for (const pluginId of readdirSync(pluginsRoot)) {
      const pluginDir = join(pluginsRoot, pluginId);
      let topEntries: string[];
      try {
        topEntries = readdirSync(pluginDir);
      } catch {
        continue;
      }
      for (const entry of topEntries) {
        const nested = join(pluginDir, entry);
        tryPush(join(nested, "skills"));
        try {
          for (const child of readdirSync(nested)) {
            tryPush(join(nested, child, "skills"));
            try {
              for (const grand of readdirSync(join(nested, child))) {
                tryPush(join(nested, child, grand, "skills"));
              }
            } catch {
              /* skip */
            }
          }
        } catch {
          /* skip */
        }
      }
    }
  } catch {
    /* no plugins dir */
  }
  return roots;
}

export function buildSkillRoots(agent: PluginHookAgent, homeDir: string): string[] {
  const expanded: string[] = [];
  for (const root of DEFAULT_SKILL_ROOTS) {
    if (root.includes("*")) continue;
    if (root.startsWith("~/")) {
      expanded.push(join(homeDir, root.slice(2)));
    } else if (root.startsWith(".")) {
      expanded.push(join(agent.cwd, root));
    } else {
      expanded.push(root);
    }
  }
  return [...expanded, ...DEFAULT_SKILL_ROOTS, ...discoverPaseoPluginSkillRoots(homeDir)];
}

/** Home / plugin skill roots only (no project-relative paths). */
export function buildHomeSkillRoots(homeDir: string): string[] {
  const expanded: string[] = [];
  for (const root of DEFAULT_SKILL_ROOTS) {
    if (root.includes("*")) continue;
    if (root.startsWith("~/")) {
      expanded.push(join(homeDir, root.slice(2)));
    }
  }
  return [...expanded, ...discoverPaseoPluginSkillRoots(homeDir)];
}

function toClassifyInput(item: Extract<AgentTimelineItem, { type: "tool_call" }>): ToolCallInput {
  return {
    name: item.name,
    detail: item.detail as ToolCallInput["detail"],
    metadata: item.metadata ?? null,
  };
}

function errorMessage(error: unknown): string | null {
  if (error == null) return null;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null && "message" in error) {
    const msg = (error as { message: unknown }).message;
    if (typeof msg === "string") return msg;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function toolCallToRow(
  item: Extract<AgentTimelineItem, { type: "tool_call" }>,
  agent: PluginHookAgent,
  opts: {
    skillRoots: readonly string[];
    homeDir: string;
    mcpServers?: readonly string[];
    turnId?: string | null;
    seq?: number | null;
    ts?: string | null;
    ingestedAt: string;
  },
): ToolCallRow {
  const hit = classifyToolCall(toClassifyInput(item), {
    provider: agent.provider,
    skillRoots: opts.skillRoots,
    homeDir: opts.homeDir,
    mcpServers: opts.mcpServers,
  });
  return {
    agentId: agent.id,
    callId: item.callId,
    workspaceId: agent.workspaceId,
    provider: agent.provider,
    turnId: opts.turnId ?? null,
    name: item.name,
    detailType: hit.detailType,
    category: hit.category,
    confidence: hit.confidence,
    skillName: hit.skillName,
    skillUses: hit.skillUses,
    mcpServer: hit.mcpServer,
    mcpTool: hit.mcpTool,
    command: hit.command,
    filePath: hit.filePath,
    status: item.status,
    errorMessage: errorMessage(item.error),
    seq: opts.seq ?? null,
    ts: opts.ts ?? null,
    ingestedAt: opts.ingestedAt,
  };
}

export function toolCallToRows(
  item: Extract<AgentTimelineItem, { type: "tool_call" }>,
  agent: PluginHookAgent,
  options: Parameters<typeof toolCallToRow>[2],
): ToolCallRow[] {
  const rows = [toolCallToRow(item, agent, options)];
  if (item.name !== "codemode") return rows;
  const output = (item.detail as ToolCallInput["detail"])?.output;
  for (const nested of nestedSkillCalls(output)) {
    if (!nested.callId.startsWith(`${item.callId}/`)) continue;
    rows.push(toolCallToRow({ type: "tool_call", ...nested, error: null }, agent, options));
  }
  return rows;
}

/**
 * Map a timeline snapshot to tool_call rows (pure; no store I/O).
 *
 * Live turn_ended snapshots are full history — do not stamp event.turnId on every
 * row (would mis-attribute older calls). Pass turnId only for known single-turn
 * or backfill paths.
 */
export function ingestTimeline(
  timeline: readonly AgentTimelineItem[],
  agent: PluginHookAgent,
  turnId: string | null,
  options: IngestClassifyOptions = {},
  now: () => Date = () => new Date(),
): ToolCallRow[] {
  const homeDir = options.homeDir ?? "";
  const skillRoots =
    options.skillRoots ?? (homeDir ? buildSkillRoots(agent, homeDir) : [...DEFAULT_SKILL_ROOTS]);
  const mcpServers =
    options.mcpServers ??
    (homeDir
      ? resolveMcpServers({ homeDir, cwd: agent.cwd, agentId: agent.id })
      : undefined);
  const ingestedAt = now().toISOString();
  const rows: ToolCallRow[] = [];
  const explicitCalls = new Set(timeline.filter((item) => item.type === "tool_call").map((item) => item.callId));
  for (const item of timeline) {
    if (item.type !== "tool_call") continue;
    rows.push(
      ...toolCallToRows(item, agent, {
        skillRoots,
        homeDir,
        mcpServers,
        turnId,
        ingestedAt,
      }).filter((row) => row.callId === item.callId || !explicitCalls.has(row.callId)),
    );
  }
  return rows;
}

/** Scan a turn_ended timeline snapshot and upsert tool_calls. Never throws. */
export function ingestTurnTimeline(
  agent: PluginHookAgent,
  timeline: readonly AgentTimelineItem[],
  options: IngestTurnOptions,
): { upserted: number } {
  try {
    const nowIso = options.now ?? (() => new Date().toISOString());
    const rows = ingestTimeline(
      timeline,
      agent,
      null,
      {
        homeDir: options.homeDir ?? homedir(),
        skillRoots: options.skillRoots,
        mcpServers: options.mcpServers,
      },
      () => new Date(nowIso()),
    );
    options.store.upsertUserMessages(
      ingestUserMessages(timeline, agent, {
        ingestedAt: nowIso(),
        model: options.model ?? null,
      }),
    );
    if (rows.length === 0) return { upserted: 0 };
    return { upserted: options.store.upsertMany(rows) };
  } catch (err) {
    console.error("[activity] ingestTurnTimeline failed:", err);
    return { upserted: 0 };
  }
}

/** No body is persisted. Anonymous live items wait for canonical identity. */
export function ingestUserMessages(
  timeline: readonly AgentTimelineItem[],
  agent: PluginHookAgent,
  opts: {
    turnId?: string | null;
    seq?: number;
    ts?: string;
    ingestedAt?: string;
    model?: string | null;
  } = {},
): UserMessageRow[] {
  const rows: UserMessageRow[] = [];
  const ingestedAt = opts.ingestedAt ?? new Date().toISOString();
  const model =
    typeof opts.model === "string" && opts.model.trim() ? opts.model.trim() : null;
  for (const item of timeline) {
    if (item.type !== "user_message") continue;
    const identity = item as typeof item & { id?: unknown };
    const id = [item.messageId, item.clientMessageId, identity.id]
      .find((value): value is string => typeof value === "string" && !!value.trim());
    if (!id && opts.seq === undefined) continue;
    const messageId = id ?? `canonical:${createHash("sha256")
      .update(JSON.stringify([agent.id, opts.turnId ?? null, opts.seq])).digest("hex")}`;
    rows.push({
      agentId: agent.id,
      messageId,
      workspaceId: agent.workspaceId,
      provider: agent.provider,
      model,
      turnId: opts.turnId ?? null,
      seq: opts.seq ?? null,
      ts: opts.ts ?? null,
      ingestedAt,
    });
  }
  return rows;
}
