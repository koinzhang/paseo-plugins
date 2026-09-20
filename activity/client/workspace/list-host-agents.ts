import {
  attentionRank,
  type AgentStatusInfo,
} from "./constants.ts";

export type HostAgentEntry = {
  agent: {
    id: string;
    workspaceId?: string;
    status?: string;
    archivedAt?: string | null;
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

export function applyAgentStatusUpdate(
  map: Record<string, AgentStatusInfo>, workspaceId: string, update: HostAgentUpdate,
): void {
  const id = update.kind === "remove" ? update.agentId : update.agent.id;
  if (update.kind === "remove") {
    // Removal is directory membership, not Closed or Archived.
    delete map[id];
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
    archivedAt: agent.archivedAt !== undefined ? agent.archivedAt : previous?.archivedAt,
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
