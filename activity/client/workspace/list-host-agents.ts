import { listAllAgentPages } from "../../shared/list-agent-pages.ts";
import {
  attentionRank,
  HOST_AGENT_PAGE_LIMIT,
  type AgentStatusInfo,
} from "./constants.ts";

export type HostAgentEntry = {
  agent: {
    id: string;
    workspaceId?: string;
    status?: string;
    updatedAt?: string;
    requiresAttention?: boolean;
    attentionReason?: string | null;
    pendingPermissions?: ReadonlyArray<unknown>;
    parentAgentId?: string | null;
    labels?: Readonly<Record<string, string>>;
  };
};

export type HostAgentUpdate =
  | { kind: "remove"; agentId: string }
  | { kind: "upsert"; agent: HostAgentEntry["agent"] };

/** Prefer first-class parentAgentId; fall back to legacy label (agent-crew / older snapshots). */
export const PARENT_AGENT_ID_LABEL = "paseo.parent-agent-id";

export function resolveParentAgentId(agent: HostAgentEntry["agent"]): string | null {
  const firstClass = agent.parentAgentId;
  if (typeof firstClass === "string" && firstClass.trim()) return firstClass.trim();
  const legacy = agent.labels?.[PARENT_AGENT_ID_LABEL];
  return typeof legacy === "string" && legacy.trim() ? legacy.trim() : null;
}

type HostAgentsApi = {
  agents: {
    subscribe?: (handler: (update: HostAgentUpdate) => void) => () => void;
    list: (options: {
      filter?: { includeArchived?: boolean; projectKeys?: string[] };
      page?: { limit: number; cursor?: string };
    }) => Promise<{
      entries: ReadonlyArray<HostAgentEntry>;
      pageInfo: { hasMore: boolean; nextCursor: string | null };
    }>;
  };
};

/**
 * Fetch project agents then enforce workspace scope. In daemon 0.8,
 * ProjectPlacement.projectKey is projectId; the project catalog's repository
 * key is a different identifier and produces an empty agent directory.
 */
export async function loadWorkspaceAgentStatuses(
  paseo: HostAgentsApi,
  workspaceId: string,
  projectId?: string | null,
): Promise<Record<string, AgentStatusInfo>> {
  const pending: HostAgentUpdate[] = [];
  const unsubscribe = paseo.agents.subscribe?.((update) => pending.push(update));
  try {
    const entries = await listAllAgentPages(
      async (cursor) => {
        const result = await paseo.agents.list({
          filter: { includeArchived: true, ...(projectId ? { projectKeys: [projectId] } : {}) },
          page: { limit: HOST_AGENT_PAGE_LIMIT, ...(cursor ? { cursor } : {}) },
        });
        return { entries: result.entries, pageInfo: result.pageInfo };
      },
    );

    const map: Record<string, AgentStatusInfo> = {};
    for (const entry of entries) {
      const agent = entry.agent;
      if (agent.workspaceId !== workspaceId) continue;
      map[agent.id] = agentStatusInfo(agent);
    }
    for (const update of pending) applyAgentStatusUpdate(map, workspaceId, update);
    return map;
  } finally {
    unsubscribe?.();
  }
}

export function applyAgentStatusUpdate(
  map: Record<string, AgentStatusInfo>, workspaceId: string, update: HostAgentUpdate,
): void {
  const id = update.kind === "remove" ? update.agentId : update.agent.id;
  if (update.kind === "remove") {
    // Keep the row as Closed so Lifecycle filters work until the next list poll.
    const previous = map[id];
    if (!previous) return;
    map[id] = agentStatusInfo(
      { id, workspaceId, status: "closed", updatedAt: previous.updatedAt ?? undefined },
      previous,
    );
    return;
  }
  const agentWorkspaceId = update.agent.workspaceId;
  if (agentWorkspaceId != null && agentWorkspaceId !== workspaceId) {
    delete map[id];
    return;
  }
  // Missing workspaceId: still merge when we already track the agent (043).
  if (agentWorkspaceId == null && !(id in map)) return;
  map[id] = agentStatusInfo(update.agent, map[id]);
}

/** Map host agent → status; preserve prior attention fields when the push omits them. */
export function agentStatusInfo(
  agent: HostAgentEntry["agent"],
  previous?: AgentStatusInfo,
): AgentStatusInfo {
  const permissionCount =
    agent.pendingPermissions !== undefined
      ? agent.pendingPermissions.length
      : (previous?.permissionCount ?? 0);
  const requiresAttention =
    agent.requiresAttention !== undefined
      ? agent.requiresAttention === true
      : (previous?.requiresAttention ?? false);
  const attentionReason =
    agent.attentionReason !== undefined
      ? agent.attentionReason
      : (previous?.attentionReason ?? null);
  const parentSpecified =
    agent.parentAgentId !== undefined ||
    (agent.labels != null && PARENT_AGENT_ID_LABEL in agent.labels);
  const parentAgentId = parentSpecified
    ? resolveParentAgentId(agent)
    : (previous?.parentAgentId ?? null);
  return {
    rank: attentionRank({
      status: agent.status,
      requiresAttention,
      attentionReason,
      pendingPermissions: agent.pendingPermissions ??
        (permissionCount > 0 ? Array.from({ length: permissionCount }) : undefined),
    }),
    updatedAt: agent.updatedAt ?? previous?.updatedAt ?? null,
    status: agent.status ?? previous?.status ?? null,
    permissionCount,
    requiresAttention,
    attentionReason,
    parentAgentId,
  };
}
