import { listAllAgentPages } from "../../shared/list-agent-pages.ts";
import {
  attentionRank,
  HOST_AGENT_PAGE_LIMIT,
  type AgentStatusInfo,
} from "./constants.ts";

type HostAgentEntry = {
  agent: {
    id: string;
    workspaceId?: string;
    status?: string;
    updatedAt?: string;
    requiresAttention?: boolean;
    attentionReason?: string | null;
  };
};

type HostAgentsApi = {
  agents: {
    list: (options: {
      filter?: { includeArchived?: boolean };
      page?: { limit: number; cursor?: string };
    }) => Promise<{
      entries: ReadonlyArray<HostAgentEntry>;
      pageInfo: { hasMore: boolean; nextCursor: string | null };
    }>;
  };
};

/** Fetch all host agents (paged) and build workspace-scoped status enrichment. */
export async function loadWorkspaceAgentStatuses(
  paseo: HostAgentsApi,
  workspaceId: string,
): Promise<Record<string, AgentStatusInfo>> {
  const entries = await listAllAgentPages(
    async (cursor) => {
      const result = await paseo.agents.list({
        filter: { includeArchived: true },
        page: { limit: HOST_AGENT_PAGE_LIMIT, ...(cursor ? { cursor } : {}) },
      });
      return { entries: result.entries, pageInfo: result.pageInfo };
    },
  );

  const map: Record<string, AgentStatusInfo> = {};
  for (const entry of entries) {
    const agent = entry.agent;
    if (agent.workspaceId && agent.workspaceId !== workspaceId) continue;
    map[agent.id] = {
      rank: attentionRank(agent),
      updatedAt: agent.updatedAt ?? null,
      status: agent.status ?? null,
    };
  }
  return map;
}
