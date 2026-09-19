import { useRpc } from "@getpaseo/plugin/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  usageMcpByToolRpc,
  usageSkillsByNameRpc,
} from "../shared/usage.ts";
import {
  pillDataIsEmpty,
  seedPillDataForQuery,
  writePillDataCache,
  type UsagePillData,
} from "./pill-data-cache.ts";
import { useAgentTurnEnd } from "./use-agent-turn-end.ts";

export type { UsagePillData } from "./pill-data-cache.ts";
export { __setPillDataCacheForTests, clearPillDataCache } from "./pill-data-cache.ts";

/** Fallback poll while empty; host turn-end events drive the fast path. */
const EMPTY_REFETCH_MS = 5_000;

/** Current-agent skills/mcp breakdown for the composer pill (no summary — unused in UI). */
export function useUsagePillData(agentId: string) {
  const skillsRpc = useRpc(usageSkillsByNameRpc);
  const mcpRpc = useRpc(usageMcpByToolRpc);
  const queryClient = useQueryClient();
  useAgentTurnEnd({ agentId }, () => {
    void queryClient.invalidateQueries({ queryKey: ["activity", "pill", "agent", agentId] });
  });
  return useQuery({
    queryKey: ["activity", "pill", "agent", agentId],
    queryFn: async () => {
      const [skills, mcp] = await Promise.all([
        skillsRpc({ agentId }),
        mcpRpc({ agentId }),
      ]);
      const data: UsagePillData = {
        skills: skills.items,
        mcpTools: mcp.items,
      };
      writePillDataCache(agentId, data);
      return data;
    },
    enabled: Boolean(agentId),
    // Idle remount must not reuse a stale empty cache from mid-turn.
    staleTime: 0,
    refetchOnMount: "always",
    // Host QueryClient defaults to retry:3; deterministic RPC errors just delay the badge.
    retry: false,
    // Seed non-empty module cache so popover paints immediately across QueryClients.
    initialData: () => seedPillDataForQuery(agentId),
    initialDataUpdatedAt: () =>
      seedPillDataForQuery(agentId) ? Date.now() : undefined,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return EMPTY_REFETCH_MS;
      return pillDataIsEmpty(data) ? EMPTY_REFETCH_MS : 15_000;
    },
  });
}
