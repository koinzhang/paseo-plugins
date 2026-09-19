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
  };
};

export type HostAgentUpdate =
  | { kind: "remove"; agentId: string }
  | { kind: "upsert"; agent: HostAgentEntry["agent"] };

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
  if (update.kind === "remove" || update.agent.workspaceId !== workspaceId) delete map[id];
  else map[id] = agentStatusInfo(update.agent);
}

export function agentStatusInfo(agent: HostAgentEntry["agent"]): AgentStatusInfo {
  return {
    rank: attentionRank(agent),
    updatedAt: agent.updatedAt ?? null,
    status: agent.status ?? null,
    permissionCount: agent.pendingPermissions?.length ?? 0,
    requiresAttention: agent.requiresAttention === true,
    attentionReason: agent.attentionReason ?? null,
  };
}
