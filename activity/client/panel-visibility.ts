import { useEffect, useRef } from "react";

/**
 * Which workspaces currently have a mounted Workspace Activity panel (067).
 *
 * Inactive tabs and a collapsed Explorer stay mounted. The host can still
 * evict an inactive tab after its retained-tab limit is reached.
 */
const mounted = new Map<string, Set<object>>();
const listeners = new Set<(workspaceId: string) => void>();

export function setPanelMounted(workspaceId: string, instance: object, isMounted: boolean): void {
  const instances = mounted.get(workspaceId);
  const was = instances != null && instances.size > 0;
  if (isMounted) {
    if (instances) instances.add(instance);
    else mounted.set(workspaceId, new Set([instance]));
  } else if (instances) {
    instances.delete(instance);
    if (instances.size === 0) mounted.delete(workspaceId);
  }
  if (was === isPanelMounted(workspaceId)) return;
  for (const listener of listeners) listener(workspaceId);
}

export function isPanelMounted(workspaceId: string): boolean {
  return (mounted.get(workspaceId)?.size ?? 0) > 0;
}

/** Called with the workspace id whenever its mounted state flips. */
export function watchPanelPresence(listener: (workspaceId: string) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Registers a panel until unmount or workspace change. */
export function usePanelPresenceReport(workspaceId: string): void {
  const instance = useRef({}).current;
  useEffect(() => {
    setPanelMounted(workspaceId, instance, true);
    return () => setPanelMounted(workspaceId, instance, false);
  }, [workspaceId, instance]);
}
