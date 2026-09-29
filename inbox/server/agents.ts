import type { DaemonClient } from "@getpaseo/client/internal/daemon-client";
import type { PaseoApi } from "@getpaseo/client";
import type { AgentCandidate, AgentLive, AgentSnapshot, AgentState } from "../shared/contracts.ts";

const PAGE_LIMIT = 200;
const MAX_PAGES = 100;

export interface AgentLookup {
  snapshot: AgentSnapshot;
  archived: boolean;
  live: AgentLive;
}

function liveAttention(agent: {
  pendingPermissions?: ReadonlyArray<unknown>;
  requiresAttention?: boolean;
  attentionReason?: string | null;
}): AgentLive["attention"] {
  if ((agent.pendingPermissions?.length ?? 0) > 0) return "permission";
  if (!agent.requiresAttention) return null;
  const reason = agent.attentionReason;
  return reason === "finished" || reason === "error" || reason === "permission" ? reason : null;
}

/** Reads an agent through the public SDK; null when the daemon no longer knows it. */
export async function lookupAgent(paseo: PaseoApi, agentId: string): Promise<AgentLookup | null> {
  let result;
  try {
    result = await paseo.agents.ref(agentId).refresh();
  } catch {
    return null;
  }
  if (!result) return null;
  const { agent } = result;
  return {
    snapshot: {
      title: agent.title,
      provider: agent.provider,
      model: agent.model,
      workspaceId: agent.workspaceId ?? null,
      cwd: agent.cwd,
      createdAt: agent.createdAt,
    },
    archived: Boolean(agent.archivedAt),
    live: {
      status: agent.status,
      attention: liveAttention(agent),
      permissions: agent.pendingPermissions?.length ?? 0,
    },
  };
}

export async function agentState(
  paseo: PaseoApi,
  agentId: string,
): Promise<{ state: AgentState; live: AgentLive | null }> {
  const found = await lookupAgent(paseo, agentId);
  if (!found) return { state: "missing", live: null };
  return { state: found.archived ? "archived" : "active", live: found.live };
}

/** Active workspace id → display name; archived workspaces are not listed by the daemon. */
export async function activeWorkspaces(paseo: PaseoApi): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  let cursor: string | undefined;
  for (let pages = 0; pages < MAX_PAGES; pages++) {
    const page = await paseo.workspaces.list({
      page: { limit: PAGE_LIMIT, ...(cursor ? { cursor } : {}) },
    });
    for (const workspace of page.entries) names.set(workspace.id, workspace.name);
    if (!page.pageInfo.hasMore || !page.pageInfo.nextCursor) break;
    cursor = page.pageInfo.nextCursor;
  }
  return names;
}

/** Unarchived agents of one workspace. */
export async function workspaceAgents(paseo: PaseoApi, workspaceId: string): Promise<AgentCandidate[]> {
  const agents: AgentCandidate[] = [];
  let cursor: string | undefined;
  for (let pages = 0; pages < MAX_PAGES; pages++) {
    const page = await paseo.agents.list({
      page: { limit: PAGE_LIMIT, ...(cursor ? { cursor } : {}) },
    });
    for (const { agent } of page.entries) {
      if (agent.workspaceId !== workspaceId || agent.archivedAt) continue;
      agents.push({ id: agent.id, title: agent.title, provider: agent.provider });
    }
    if (!page.pageInfo.hasMore || !page.pageInfo.nextCursor) break;
    cursor = page.pageInfo.nextCursor;
  }
  return agents;
}

/**
 * Unarchives an agent the way the app does, restoring its archived workspace first.
 * The public SDK has no unarchive, so this uses the internal daemon client.
 */
export async function unarchiveAgent(
  client: DaemonClient,
  agentId: string,
): Promise<{ restoredWorkspace: boolean }> {
  const fetched = await client.fetchAgent(agentId);
  if (!fetched) throw new Error("This agent no longer exists on the host");

  let restoredWorkspace = false;
  const workspaceId = fetched.agent.workspaceId;
  const supportsRecovery = client.getLastServerInfoMessage()?.features?.workspaceRecovery === true;
  if (workspaceId && supportsRecovery) {
    const recovery = await client.inspectWorkspaceRecovery(workspaceId);
    if (recovery.kind === "recoverable") {
      await client.restoreWorkspace(workspaceId);
      restoredWorkspace = true;
    } else if (recovery.reason !== "workspace_not_archived") {
      throw new Error(recovery.message);
    }
  }

  await client.refreshAgent(agentId);
  return { restoredWorkspace };
}
