import type { PluginHookAgent } from "@getpaseo/plugin/server";
import type { AgentRow, ToolCallRow } from "./store.ts";

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
}): AgentRow {
  const updatedAt = nowIso();
  return {
    agentId: agent.id,
    workspaceId: agent.workspaceId ?? null,
    parentAgentId: agent.parentAgentId ?? null,
    provider: agent.provider,
    title: agent.title ?? null,
    createdAt: agent.createdAt,
    archivedAt: null,
    updatedAt,
  };
}

/** Earliest tool activity per agentId → approximate created_at for unknown agents. */
export function agentsFromToolCalls(rows: readonly ToolCallRow[]): AgentRow[] {
  const earliest = new Map<
    string,
    { provider: string; workspaceId: string | null; createdAt: string }
  >();
  for (const row of rows) {
    const t = row.ts ?? row.ingestedAt;
    const prev = earliest.get(row.agentId);
    if (!prev || t < prev.createdAt) {
      earliest.set(row.agentId, {
        provider: row.provider,
        workspaceId: row.workspaceId,
        createdAt: t,
      });
    }
  }
  const updatedAt = nowIso();
  return [...earliest.entries()].map(([agentId, info]) => ({
    agentId,
    workspaceId: info.workspaceId,
    parentAgentId: null,
    provider: info.provider,
    title: null,
    createdAt: info.createdAt,
    archivedAt: null,
    updatedAt,
  }));
}

