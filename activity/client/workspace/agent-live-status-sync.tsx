import { useAgent, useWorkspace } from "@getpaseo/plugin/client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { workspaceAgentStatusQueryKey } from "../use-workspace-agent-statuses.ts";
import type { AgentStatusInfo } from "./constants.ts";
import { updateWorkspaceStatusCache } from "./status-cache.ts";

type LiveFields = {
  status: AgentStatusInfo["status"];
  updatedAt: string | null;
  requiresAttention: boolean;
  attentionReason: AgentStatusInfo["attentionReason"];
  parentAgentId: string | null;
};

function sameLiveFields(current: AgentStatusInfo | undefined, next: LiveFields): boolean {
  if (!current) return false;
  return (
    current.status === next.status &&
    current.updatedAt === next.updatedAt &&
    current.requiresAttention === next.requiresAttention &&
    current.attentionReason === next.attentionReason &&
    current.parentAgentId === next.parentAgentId
  );
}

/** Push one host-normalized snapshot into the workspace status query cache (043). */
function AgentLiveStatusSync({
  agentId,
  workspaceId,
}: {
  agentId: string;
  workspaceId: string;
}): null {
  const queryClient = useQueryClient();
  const projectId = useWorkspace(workspaceId, (workspace) => workspace.projectId);
  const queryKey = workspaceAgentStatusQueryKey(workspaceId, projectId);
  const live = useAgent(agentId, (agent) => ({
    status: agent.status,
    updatedAt: agent.updatedAt,
    requiresAttention: agent.requiresAttention,
    attentionReason: agent.attentionReason,
    parentAgentId: agent.parentAgentId,
  }));

  useEffect(() => {
    const previous = queryClient.getQueryData<Record<string, AgentStatusInfo>>(queryKey);
    if (!previous) return;

    if (live == null) {
      if (!(agentId in previous) || previous[agentId]?.status === "closed") return;
      updateWorkspaceStatusCache(queryClient, queryKey, workspaceId, {
        kind: "upsert",
        agent: { id: agentId, workspaceId, status: "closed" },
      });
      return;
    }

    const next: LiveFields = {
      status: live.status,
      updatedAt: live.updatedAt,
      requiresAttention: live.requiresAttention,
      attentionReason: live.attentionReason,
      parentAgentId: live.parentAgentId,
    };
    if (sameLiveFields(previous[agentId], next)) return;

    updateWorkspaceStatusCache(queryClient, queryKey, workspaceId, {
      kind: "upsert",
      agent: {
        id: agentId,
        workspaceId,
        status: live.status,
        updatedAt: live.updatedAt,
        requiresAttention: live.requiresAttention,
        attentionReason: live.attentionReason,
        parentAgentId: live.parentAgentId,
      },
    });
  }, [agentId, live, queryClient, queryKey, workspaceId]);

  return null;
}

/**
 * Official real-time path for lifecycle / attention fields without owning
 * `agents.list({ subscribe })`. pendingPermissions still come from list polls.
 */
export function WorkspaceAgentLiveStatusSync({
  agentIds,
  workspaceId,
}: {
  agentIds: ReadonlyArray<string>;
  workspaceId: string;
}): ReactNode {
  return (
    <>
      {agentIds.map((agentId) => (
        <AgentLiveStatusSync key={agentId} agentId={agentId} workspaceId={workspaceId} />
      ))}
    </>
  );
}
