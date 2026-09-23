import { useCallback, useEffect, useRef } from "react";
import type { LayoutChangeEvent } from "react-native";

/**
 * Which workspaces currently show the Workspace Activity panel (067).
 *
 * The host exposes no panel visibility API and keeps hidden panels mounted
 * with a 0-size container, so each mounted instance reports its own layout
 * size: > 0 is visible, 0 or unmounted is hidden.
 */
const visible = new Map<string, Set<object>>();
const listeners = new Set<(workspaceId: string) => void>();

export function setPanelVisible(workspaceId: string, instance: object, isVisible: boolean): void {
  const instances = visible.get(workspaceId);
  const was = instances != null && instances.size > 0;
  if (isVisible) {
    if (instances) instances.add(instance);
    else visible.set(workspaceId, new Set([instance]));
  } else if (instances) {
    instances.delete(instance);
    if (instances.size === 0) visible.delete(workspaceId);
  }
  if (was === isPanelVisible(workspaceId)) return;
  for (const listener of listeners) listener(workspaceId);
}

export function isPanelVisible(workspaceId: string): boolean {
  return (visible.get(workspaceId)?.size ?? 0) > 0;
}

/** Called with the workspace id whenever its visibility flips. */
export function watchPanelVisibility(listener: (workspaceId: string) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** `onLayout` for the panel root; clears the report on unmount or workspace change. */
export function usePanelVisibilityReport(workspaceId: string): (event: LayoutChangeEvent) => void {
  const instance = useRef({}).current;
  useEffect(() => () => setPanelVisible(workspaceId, instance, false), [workspaceId, instance]);
  return useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setPanelVisible(workspaceId, instance, width > 0 && height > 0);
  }, [workspaceId, instance]);
}
