import { useSyncExternalStore } from "react";
import type { AgentStatusInfo } from "./workspace/constants.ts";

const byWorkspace = new Map<string, Record<string, AgentStatusInfo>>();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Publish push/poll status for a workspace; icon + popover read this immediately. */
export function publishAttentionStatuses(
  workspaceId: string,
  statuses: Record<string, AgentStatusInfo>,
): void {
  byWorkspace.set(workspaceId, statuses);
  emit();
}

export function getAttentionStatuses(
  workspaceId: string,
): Record<string, AgentStatusInfo> | undefined {
  return byWorkspace.get(workspaceId);
}

export function clearAttentionStatuses(): void {
  byWorkspace.clear();
  emit();
}

/** Re-renders when contribute-layer status for this workspace is republished. */
export function useAttentionStatuses(
  workspaceId: string,
): Record<string, AgentStatusInfo> | undefined {
  return useSyncExternalStore(
    subscribe,
    () => byWorkspace.get(workspaceId),
    () => undefined,
  );
}
