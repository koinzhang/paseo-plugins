import {
  usePaseo,
  useWorkspace,
} from "@getpaseo/plugin/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import type { AgentStatusInfo } from "./workspace/constants.ts";
import { loadWorkspaceAgentStatuses } from "./workspace/list-host-agents.ts";
import { updateWorkspaceStatusCache } from "./workspace/status-cache.ts";

export function workspaceAgentStatusQueryKey(
  workspaceId: string,
  projectId: string | null | undefined,
) {
  return ["activity", "workspace-agent-status", workspaceId, projectId ?? null] as const;
}

/**
 * Shared host agent status map for a workspace (Explorer + attention pill).
 * 15s poll owns completeness; subscribe accelerates without list({ subscribe }).
 */
export function useWorkspaceAgentStatuses(workspaceId: string) {
  const paseo = usePaseo();
  const queryClient = useQueryClient();
  const projectId = useWorkspace(workspaceId, (workspace) => workspace.projectId);
  const queryKey = useMemo(
    () => workspaceAgentStatusQueryKey(workspaceId, projectId),
    [workspaceId, projectId],
  );

  const query = useQuery({
    refetchInterval: 15_000,
    retry: false,
    queryKey,
    queryFn: () => loadWorkspaceAgentStatuses(paseo, workspaceId, projectId),
  });

  useEffect(
    () =>
      paseo.agents.subscribe((update) => {
        updateWorkspaceStatusCache(queryClient, queryKey, workspaceId, update);
      }),
    [paseo, queryClient, workspaceId, queryKey],
  );

  return query as typeof query & { data: Record<string, AgentStatusInfo> | undefined };
}
