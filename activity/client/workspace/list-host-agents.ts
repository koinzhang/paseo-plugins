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

type HostAgentsApi = {
  agents: {
    list: (options: {
      filter?: { includeArchived?: boolean; projectKeys?: string[] };
      page?: { limit: number; cursor?: string };
    }) => Promise<{
      entries: ReadonlyArray<HostAgentEntry>;
      pageInfo: { hasMore: boolean; nextCursor: string | null };
    }>;
  };
};

/** Fetch project agents when its key is known, then enforce workspace scope. */
export async function loadWorkspaceAgentStatuses(
  paseo: HostAgentsApi,
  workspaceId: string,
  projectKey?: string | null,
): Promise<Record<string, AgentStatusInfo>> {
  const entries = await listAllAgentPages(
    async (cursor) => {
      const result = await paseo.agents.list({
        filter: { includeArchived: true, ...(projectKey ? { projectKeys: [projectKey] } : {}) },
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
  return map;
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
