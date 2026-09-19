import type { AgentTimelineItem } from "./host-types.ts";
import type { RpcInput, RpcOutput } from "@getpaseo/plugin";
import type { PluginHandlerContext, PluginHookAgent } from "@getpaseo/plugin/server";
import { homedir } from "node:os";
import { basename, dirname, resolve, sep } from "node:path";
import { realpathSync, statSync } from "node:fs";
import {
  aggregateByProvider,
  aggregateMcpByTool,
  aggregateShellTop,
  aggregateSkillsByName,
  aggregateActivityByDay,
  isFileRead,
  isFileWrite,
  isShellCall,
  usageActivityByDayRpc,
  usageByProviderRpc,
  usageExportRpc,
  usageListRpc,
  usageMcpByToolRpc,
  usageReadSkillRpc,
  usageSkillsByNameRpc,
  usageSummaryRpc,
} from "../shared/usage.ts";
import { DEFAULT_SKILL_ROOTS, matchSkillFile } from "../shared/classify.ts";
import { buildHomeSkillRoots, buildSkillRoots, toolCallToRow, ingestUserMessages } from "./ingest.ts";
import { normalizeModelId } from "./resolve-model.ts";
import { resolveMcpServers } from "./mcp-servers.ts";
import {
  collapseHomePath,
  expandHomePath,
  finalizeSkillPaths,
} from "./skill-path.ts";
import type { QueryFilter, ToolCallRow, UserMessageRow, UsageStore } from "./store.ts";
import { formatLocalDateTime } from "../shared/format.ts";
import { agentRowFromSnapshot } from "./agents.ts";
import { readFile } from "node:fs/promises";

type PaseoApi = PluginHandlerContext["paseo"];

export type UsageSummary = RpcOutput<typeof usageSummaryRpc>;
export type UsageListResult = RpcOutput<typeof usageListRpc>;

export function summarizeRows(rows: readonly ToolCallRow[]): UsageSummary {
  const skillCalls = { exact: 0, inferred: 0, low: 0 };
  const toolCallsByKind: Record<string, number> = {};
  let shellCalls = 0;
  let shellFailures = 0;
  let fileReads = 0;
  let fileWrites = 0;
  let mcpCalls = 0;
  let mcpFailures = 0;

  for (const row of rows) {
    const kind = row.detailType ?? "unknown";
    toolCallsByKind[kind] = (toolCallsByKind[kind] ?? 0) + 1;

    if (row.category === "skill") {
      if (row.confidence === "exact") skillCalls.exact += 1;
      else if (row.confidence === "inferred") skillCalls.inferred += 1;
      else if (row.confidence === "low") skillCalls.low += 1;
      else skillCalls.inferred += 1;
    } else if (row.category === "mcp") {
      mcpCalls += 1;
      if (row.status === "failed") mcpFailures += 1;
    }

    if (isShellCall(row)) {
      shellCalls += 1;
      if (row.status === "failed") shellFailures += 1;
    }
    if (isFileRead(row)) fileReads += 1;
    if (isFileWrite(row)) fileWrites += 1;
  }

  return {
    shellCalls,
    shellFailures,
    fileReads,
    fileWrites,
    skillCalls,
    mcpCalls,
    mcpFailures,
    toolCallsByKind,
  };
}

export function createSummaryHandler(store: UsageStore) {
  return async (input: RpcInput<typeof usageSummaryRpc>): Promise<UsageSummary> => {
    const filter: QueryFilter = {
      agentId: input.agentId,
      workspaceId: input.workspaceId,
      from: input.from,
      to: input.to,
    };
    return summarizeRows(store.select(filter));
  };
}

export function createListHandler(store: UsageStore) {
  return async (input: RpcInput<typeof usageListRpc>): Promise<UsageListResult> => {
    const filter: QueryFilter = {
      agentId: input.agentId,
      category: input.category,
      confidence: input.confidence,
      skillName: input.skillName,
      mcpServer: input.mcpServer,
      from: input.from,
      to: input.to,
    };
    const matched = store.select(filter).sort((a, b) => {
      const ta = a.ts ?? a.ingestedAt;
      const tb = b.ts ?? b.ingestedAt;
      return tb.localeCompare(ta);
    });
    const offset = input.offset ?? 0;
    const limit = input.limit ?? 200;
    const page = matched.slice(offset, offset + limit);
    return {
      total: matched.length,
      rows: page.map((row) => ({
        agentId: row.agentId,
        callId: row.callId,
        provider: row.provider,
        name: row.name,
        category: row.category,
        confidence: row.confidence,
        skillName: row.skillName,
        mcpServer: row.mcpServer,
        mcpTool: row.mcpTool,
        command: row.command,
        status: row.status,
        ts: row.ts,
        ingestedAt: row.ingestedAt,
      })),
    };
  };
}

function skillRootsForQuery(
  paseo: PaseoApi,
  agentId: string | undefined,
  homeDir: string,
): string[] {
  if (!agentId) return buildHomeSkillRoots(homeDir);
  const handle = paseo.agents.ref(agentId);
  const snapshot = handle.current();
  if (snapshot?.cwd) {
    return buildSkillRoots(agentFromSnapshot(snapshot), homeDir);
  }
  return buildHomeSkillRoots(homeDir);
}

export function createSkillsByNameHandler(store: UsageStore) {
  return async (
    input: RpcInput<typeof usageSkillsByNameRpc>,
    context: { paseo: PaseoApi },
  ): Promise<RpcOutput<typeof usageSkillsByNameRpc>> => {
    const homeDir = homedir();
    const rows = store.select({
      agentId: input.agentId,
      workspaceId: input.workspaceId,
      category: "skill",
      from: input.from,
      to: input.to,
    });
    const roots = skillRootsForQuery(context.paseo, input.agentId, homeDir);
    const items = finalizeSkillPaths(aggregateSkillsByName(rows), roots, homeDir);
    return { items };
  };
}

export function createMcpByToolHandler(store: UsageStore) {
  return async (
    input: RpcInput<typeof usageMcpByToolRpc>,
  ): Promise<RpcOutput<typeof usageMcpByToolRpc>> => {
    const rows = store.select({
      agentId: input.agentId,
      workspaceId: input.workspaceId,
      category: "mcp",
      from: input.from,
      to: input.to,
    });
    return { items: aggregateMcpByTool(rows) };
  };
}

export function createByProviderHandler(store: UsageStore) {
  return async (
    input: RpcInput<typeof usageByProviderRpc>,
  ): Promise<RpcOutput<typeof usageByProviderRpc>> => {
    const rows = store.select({
      workspaceId: input.workspaceId,
      from: input.from,
      to: input.to,
    });
    const agents = store.selectAgents({
      workspaceId: input.workspaceId,
      from: input.from,
      to: input.to,
    });
    const homeDir = homedir();
    const result = aggregateByProvider(rows, agents, store.selectUserMessages(input));
    // Global view: home / plugin roots only (no project cwd — avoids cross-workspace hits).
    const roots = buildHomeSkillRoots(homeDir);
    return {
      ...result,
      providers: result.providers.map((provider) => ({
        ...provider,
        skills: finalizeSkillPaths(provider.skills, roots, homeDir),
      })),
    };
  };
}

export function createActivityByDayHandler(store: UsageStore) {
  return async (
    input: RpcInput<typeof usageActivityByDayRpc>,
  ): Promise<RpcOutput<typeof usageActivityByDayRpc>> => {
    const rows = store.select({
      workspaceId: input.workspaceId,
      from: input.from,
      to: input.to,
    });
    const agents = store.selectAgents({
      workspaceId: input.workspaceId,
      from: input.from,
      to: input.to,
      provider: input.provider,
    });
    return {
      days: aggregateActivityByDay(rows, {
        provider: input.provider,
        agents,
        messages: store.selectUserMessages(input),
      }),
    };
  };
}

const MAX_SKILL_BYTES = 512 * 1024;

function isPathInside(absolute: string, root: string): boolean {
  const abs = resolve(absolute);
  const base = resolve(root);
  return abs === base || abs.startsWith(base.endsWith(sep) ? base : `${base}${sep}`);
}

function assertAllowedSkillPath(absolute: string, homeDir: string): string {
  const normalized = absolute.replace(/\\/g, "/");
  if (!/\/SKILL\.md$/i.test(normalized)) {
    throw new Error("Skill path must end with SKILL.md");
  }
  let real = absolute;
  try {
    real = realpathSync(absolute);
  } catch {
    throw new Error("Skill file not found");
  }
  const roots = buildHomeSkillRoots(homeDir);
  const underHome =
    roots.some((root) => isPathInside(absolute, root) || isPathInside(real, root));
  const underDefault =
    matchSkillFile(absolute, DEFAULT_SKILL_ROOTS, homeDir) != null &&
    matchSkillFile(real, DEFAULT_SKILL_ROOTS, homeDir) != null;
  if (!underHome && !underDefault) {
    throw new Error("Skill path not allowed");
  }
  let size = 0;
  try {
    size = statSync(real).size;
  } catch {
    throw new Error("Skill file not found");
  }
  if (size > MAX_SKILL_BYTES) {
    throw new Error("Skill file too large");
  }
  return real;
}

export function createReadSkillHandler() {
  return async (
    input: RpcInput<typeof usageReadSkillRpc>,
  ): Promise<RpcOutput<typeof usageReadSkillRpc>> => {
    const raw = input.path.trim();
    if (!raw || raw.includes("\0")) {
      throw new Error("Invalid skill path");
    }
    const homeDir = homedir();
    const absolute = resolve(expandHomePath(raw, homeDir));
    const real = assertAllowedSkillPath(absolute, homeDir);
    const body = await readFile(real, "utf8");
    const skillName =
      /SKILL\.md$/i.test(real) ? basename(dirname(real)) : null;
    return { path: collapseHomePath(absolute, homeDir), skillName, body };
  };
}

export function buildExportMarkdown(
  rows: readonly ToolCallRow[],
  meta: { agentId?: string; from?: string; to?: string },
): string {
  const summary = summarizeRows(rows);
  const skills = aggregateSkillsByName(rows);
  const mcp = aggregateMcpByTool(rows);
  const shellTop = aggregateShellTop(rows);
  const lines: string[] = [
    "# Activity report",
    "",
    `- Generated: ${formatLocalDateTime(new Date().toISOString())}`,
    `- Agent: ${meta.agentId ?? "all"}`,
    `- From: ${formatLocalDateTime(meta.from)}`,
    `- To: ${formatLocalDateTime(meta.to)}`,
    "",
    "## Overview",
    "",
    `| Metric | Count |`,
    `| --- | ---: |`,
    `| Shell | ${summary.shellCalls} (${summary.shellFailures} failed) |`,
    `| File reads | ${summary.fileReads} |`,
    `| File writes | ${summary.fileWrites} |`,
    `| Skills (exact) | ${summary.skillCalls.exact} |`,
    `| Skills (inferred) | ${summary.skillCalls.inferred} |`,
    `| Skills (low) | ${summary.skillCalls.low} |`,
    `| MCP | ${summary.mcpCalls} (${summary.mcpFailures} failed) |`,
    "",
    "## Skills by name",
    "",
    `| Skill | Exact | Inferred | Low (ref) | Total (ex. low) | Last used |`,
    `| --- | ---: | ---: | ---: | ---: | --- |`,
  ];
  for (const s of skills) {
    lines.push(
      `| ${s.skillName} | ${s.exact} | ${s.inferred} | ${s.low} | ${s.total} | ${formatLocalDateTime(s.lastUsedAt)} |`,
    );
  }
  if (skills.length === 0) lines.push("| — | 0 | 0 | 0 | 0 | — |");

  lines.push("", "## MCP by tool", "", `| Server | Tool | Count | Failures |`, `| --- | --- | ---: | ---: |`);
  for (const m of mcp) {
    lines.push(`| ${m.server} | ${m.tool} | ${m.count} | ${m.failures} |`);
  }
  if (mcp.length === 0) lines.push("| — | — | 0 | 0 |");

  lines.push("", "## Shell top commands", "", `| Command | Count | Failures |`, `| --- | ---: | ---: |`);
  for (const s of shellTop) {
    lines.push(`| \`${s.command}\` | ${s.count} | ${s.failures} |`);
  }
  if (shellTop.length === 0) lines.push("| — | 0 | 0 |");

  lines.push("");
  return lines.join("\n");
}

export function createExportHandler(store: UsageStore) {
  return async (
    input: RpcInput<typeof usageExportRpc>,
  ): Promise<RpcOutput<typeof usageExportRpc>> => {
    const rows = store.select({
      agentId: input.agentId,
      from: input.from,
      to: input.to,
    });
    return {
      markdown: buildExportMarkdown(rows, {
        agentId: input.agentId,
        from: input.from,
        to: input.to,
      }),
    };
  };
}

function agentFromSnapshot(agent: {
  id: string;
  workspaceId?: string | null;
  parentAgentId?: string | null;
  provider: string;
  cwd: string;
  title?: string | null;
}): PluginHookAgent {
  return {
    id: agent.id,
    workspaceId: agent.workspaceId ?? null,
    parentAgentId: agent.parentAgentId ?? null,
    provider: agent.provider,
    cwd: agent.cwd,
    title: agent.title ?? null,
  };
}

function ingestCanonicalPage(
  store: UsageStore,
  agent: PluginHookAgent,
  entries: ReadonlyArray<{
    item: AgentTimelineItem;
    turnId?: string;
    timestamp: string;
    seqStart: number;
  }>,
  homeDir: string,
  mcpServers: readonly string[],
  model: string | null = null,
): number {
  const skillRoots = buildSkillRoots(agent, homeDir);
  const ingestedAt = new Date().toISOString();
  const rows: ToolCallRow[] = [];
  const messages: UserMessageRow[] = [];
  for (const entry of entries) {
    messages.push(...ingestUserMessages([entry.item], agent, {
      turnId: entry.turnId,
      seq: entry.seqStart,
      ts: entry.timestamp,
      ingestedAt,
      model,
    }));
    if (entry.item.type !== "tool_call") continue;
    rows.push(
      toolCallToRow(entry.item, agent, {
        skillRoots,
        homeDir,
        mcpServers,
        turnId: entry.turnId ?? null,
        seq: entry.seqStart,
        ts: entry.timestamp,
        ingestedAt,
      }),
    );
  }
  store.upsertUserMessages(messages);
  if (rows.length === 0) return 0;
  store.upsertMany(rows);
  return rows.length;
}

export type HistoryScanResult = {
  syncedAgents: number;
  inserted: number;
  errors: Array<{ agentId: string; message: string }>;
};

export async function resyncAgents(
  store: UsageStore,
  paseo: PaseoApi,
  agentIds?: string[],
  signal?: AbortSignal,
  listedEntries?: ReadonlyArray<{ agent: Parameters<typeof agentRowFromSnapshot>[0] & {
    id: string;
    provider: string;
    cwd: string;
    updatedAt?: string;
    lastUserMessageAt?: string | null;
  } }>,
): Promise<HistoryScanResult> {
  if (signal?.aborted) throw new Error("History scan canceled");
  const homeDir = homedir();
  const listed = listedEntries
    ? { entries: listedEntries }
    : await paseo.agents.list();
  const targets = listed.entries
    .map((entry) => entry.agent)
    .filter((agent) => !agentIds || agentIds.includes(agent.id));

  let syncedAgents = 0;
  let inserted = 0;
  const errors: Array<{ agentId: string; message: string }> = [];

  for (const snapshot of targets) {
    if (signal?.aborted) throw new Error("History scan canceled");
    try {
      store.upsertAgents([agentRowFromSnapshot(snapshot)]);
      const agent = agentFromSnapshot(snapshot);
      const model = normalizeModelId(
        "model" in snapshot ? (snapshot as { model?: unknown }).model : null,
      );
      const timeline = paseo.agents.ref(agent.id).timeline;
      const mcpServers = resolveMcpServers({
        homeDir,
        cwd: agent.cwd,
        agentId: agent.id,
      });
      let pageInserted = 0;

      // Always full-scan (tail → older). Upserts are idempotent and re-apply
      // classification so OpenCode MCP server-list fixes rewrite prior rows.
      let page = await timeline.refetch({
        projection: "canonical",
        direction: "tail",
        limit: 500,
      });
      if (signal?.aborted) throw new Error("History scan canceled");
      if (page.error) throw new Error(page.error);
      const newest = page.endCursor;
      const previous = store.getSyncState(agent.id);
      if (newest && previous && previous.epoch !== newest.epoch) {
        // Timeline replacement reshuffles seq; drop hash-keyed anonymous messages.
        store.deleteCanonicalUserMessages(agent.id);
      }
      for (;;) {
        if (signal?.aborted) throw new Error("History scan canceled");
        pageInserted += ingestCanonicalPage(
          store,
          agent,
          page.entries,
          homeDir,
          mcpServers,
          model,
        );
        if (!page.hasOlder || !page.startCursor) break;
        page = await timeline.refetch({
          projection: "canonical",
          direction: "before",
          cursor: page.startCursor,
          limit: 500,
        });
        if (page.error) throw new Error(page.error);
      }
      if (newest) store.setSyncState(agent.id, newest.epoch, newest.seq);

      syncedAgents += 1;
      inserted += pageInserted;
    } catch (error) {
      errors.push({
        agentId: snapshot.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { syncedAgents, inserted, errors };
}
