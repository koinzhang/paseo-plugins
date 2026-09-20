import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { AgentStatusInfo } from "./constants.ts";
import { applyAgentStatusUpdate, type HostAgentUpdate } from "./list-host-agents.ts";

/** Cancel stale reads before publishing live state; the loader buffers first-load events. */
export function updateWorkspaceStatusCache(
  queryClient: QueryClient, queryKey: QueryKey, workspaceId: string, update: HostAgentUpdate,
): void {
  const previous = queryClient.getQueryData<Record<string, AgentStatusInfo>>(queryKey);
  if (!previous) return;
  const id = update.kind === "remove" ? update.agentId : update.agent.id;
  if (!(id in previous)) {
    if (update.kind === "remove") return;
    if (update.agent.workspaceId != null && update.agent.workspaceId !== workspaceId) return;
    if (update.agent.workspaceId == null) return;
  }
  // cancelQueries cancels synchronously, even when the SDK ignores AbortSignal.
  // Restore our captured latest cache after cancellation reverts the old fetch.
  void queryClient.cancelQueries({ queryKey, exact: true });
  const next = { ...previous };
  applyAgentStatusUpdate(next, workspaceId, update);
  queryClient.setQueryData(queryKey, next);
}
