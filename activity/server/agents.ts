import type { PluginHookAgent } from "@getpaseo/plugin/server";
import type { AgentActivitySpan, AgentRow, ToolCallRow } from "./store.ts";

function nowIso(): string {
  return new Date().toISOString();
}

export function agentRowFromHook(
  agent: PluginHookAgent,
  opts: { createdAt?: string; archivedAt?: string | null; updatedAt?: string } = {},
): AgentRow {
  const updatedAt = opts.updatedAt ?? nowIso();
  return {
    agentId: agent.id,
    workspaceId: agent.workspaceId,
    parentAgentId: agent.parentAgentId,
    provider: agent.provider,
    title: agent.title,
    createdAt: opts.createdAt ?? updatedAt,
    archivedAt: opts.archivedAt ?? null,
    updatedAt,
  };
}

export function agentRowFromSnapshot(agent: {
  id: string;
  workspaceId?: string | null;
  parentAgentId?: string | null;
  provider: string;
  title?: string | null;
  createdAt: string;
  updatedAt?: string;
  archivedAt?: string | null;
}): AgentRow {
  const updatedAt = agent.updatedAt ?? agent.createdAt;
  return {
    agentId: agent.id,
    workspaceId: agent.workspaceId ?? null,
    parentAgentId: agent.parentAgentId ?? null,
    provider: agent.provider,
    title: agent.title ?? null,
    createdAt: agent.createdAt,
    archivedAt: agent.archivedAt ?? null,
    updatedAt,
  };
}

/** Store-aggregated activity spans → registry rows (same shape as `agentsFromToolCalls`). */
export function agentsFromActivitySpans(spans: readonly AgentActivitySpan[]): AgentRow[] {
  return spans.map((span) => ({
    agentId: span.agentId,
    workspaceId: span.workspaceId,
    parentAgentId: null,
    provider: span.provider,
    title: null,
    createdAt: span.firstAt,
    archivedAt: null,
    updatedAt: span.lastAt,
  }));
}

/** Earliest tool activity per agentId → approximate created_at for unknown agents. */
export function agentsFromToolCalls(rows: readonly ToolCallRow[]): AgentRow[] {
  const earliest = new Map<
    string,
    { provider: string; workspaceId: string | null; createdAt: string; updatedAt: string }
  >();
  for (const row of rows) {
    const t = row.ts ?? row.ingestedAt;
    const prev = earliest.get(row.agentId);
    if (!prev || t < prev.createdAt) {
      earliest.set(row.agentId, {
        provider: row.provider,
        workspaceId: row.workspaceId,
        createdAt: t,
        updatedAt: prev && prev.updatedAt > t ? prev.updatedAt : t,
      });
    } else if (t > prev.updatedAt) {
      prev.updatedAt = t;
    }
  }
  return [...earliest.entries()].map(([agentId, info]) => ({
    agentId,
    workspaceId: info.workspaceId,
    parentAgentId: null,
    provider: info.provider,
    title: null,
    createdAt: info.createdAt,
    archivedAt: null,
    updatedAt: info.updatedAt,
  }));
}

