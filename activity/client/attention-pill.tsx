import {
  type PluginButtonContentProps,
  type PluginButtonIconProps,
  type PluginButtonRegistration,
  type PluginClientContext,
} from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { useMemo } from "react";
import {
  attentionPillIconName,
  attentionPillTint,
  filterAttentionAgents,
  type AttentionAgentItem,
} from "./attention-agents.ts";
import { AttentionPopover, openAttentionAgent } from "./attention-popover.tsx";
import {
  clearAttentionStatuses,
  getAttentionStatuses,
  publishAttentionStatuses,
  useAttentionStatuses,
} from "./attention-status-store.ts";
import { watchPillDirectory } from "./pill-directory.ts";
import {
  applyAgentStatusUpdate,
  loadWorkspaceAgentStatuses,
  type HostAgentUpdate,
} from "./workspace/list-host-agents.ts";
import type { AgentStatusInfo } from "./workspace/constants.ts";

const TITLE = "Needs attention";
const PILL_ID = "attention";
/** Completeness backup only — live path is agents.subscribe → store → icon. */
const SYNC_MS = 15_000;

type PillEntry = {
  registration?: PluginButtonRegistration;
  workspaceId: string;
  /** Last applied sync signature (avoid no-op updates that close surfaces). */
  signature: string;
};

function attentionSignature(
  items: ReadonlyArray<{ agentId: string; kind: string; permissionCount: number }>,
): string {
  if (items.length === 0) return "0";
  return items.map((i) => `${i.agentId}:${i.kind}:${i.permissionCount}`).join("|");
}

/**
 * Composer pill for other same-workspace agents needing attention.
 *
 * Live updates: `agents.subscribe` → in-memory store → pill visibility + icon tint.
 * 15s poll is completeness only. Icon reads the same store (not a separate 15s query).
 */
export function contributeAttentionPills(client: PluginClientContext): () => void {
  const pills = new Map<string, PillEntry>();
  const inflight = new Map<string, Promise<void>>();
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function AttentionPopoverContent(props: PluginButtonContentProps) {
    return (
      <AttentionPopover
        {...props}
        openAgentSession={(targetId) => {
          if (props.context !== "agent") return;
          openAttentionAgent(targetId);
        }}
      />
    );
  }

  function setWorkspacePillsDisabled(workspaceId: string, disabled: boolean) {
    for (const entry of pills.values()) {
      if (entry.workspaceId !== workspaceId) continue;
      entry.registration?.update({ disabled });
    }
  }

  function applyPill(
    agentId: string,
    entry: PillEntry,
    statuses: Record<string, AgentStatusInfo> | undefined,
  ) {
    const pill = entry.registration;
    if (!pill) return;
    const items = filterAttentionAgents(statuses, agentId);
    const tint = attentionPillTint(items);
    const signature = `${attentionSignature(items)}:${tint ?? ""}`;
    if (entry.signature === signature) return;
    entry.signature = signature;

    if (items.length === 0) {
      pill.update({ visible: false, label: TITLE, disabled: false });
      return;
    }

    // One shared pill for finished / permission / error; always the same popover list.
    pill.update({
      visible: true,
      label: String(items.length),
      title: TITLE,
      disabled: false,
      behavior: {
        kind: "popover",
        Content: AttentionPopoverContent,
      },
    });
  }

  function applyWorkspace(workspaceId: string, statuses: Record<string, AgentStatusInfo>) {
    publishAttentionStatuses(workspaceId, statuses);
    for (const [agentId, entry] of pills) {
      if (entry.workspaceId !== workspaceId) continue;
      applyPill(agentId, entry, statuses);
    }
  }

  function syncWorkspace(workspaceId: string): Promise<void> {
    const existing = inflight.get(workspaceId);
    if (existing) return existing;
    const firstLoad = getAttentionStatuses(workspaceId) == null;
    // Only block clicks on the cold first fetch — background polls stay interactive.
    if (firstLoad) setWorkspacePillsDisabled(workspaceId, true);
    const run = (async () => {
      try {
        const statuses = await loadWorkspaceAgentStatuses(client.paseo, workspaceId, null);
        if (disposed) return;
        applyWorkspace(workspaceId, statuses);
      } catch (error) {
        if (!disposed) console.error("[activity] attention pill sync failed", workspaceId, error);
      } finally {
        inflight.delete(workspaceId);
        if (!disposed && firstLoad) setWorkspacePillsDisabled(workspaceId, false);
      }
    })();
    inflight.set(workspaceId, run);
    return run;
  }

  function syncAllWorkspaces() {
    const ids = new Set<string>();
    for (const entry of pills.values()) ids.add(entry.workspaceId);
    for (const workspaceId of ids) void syncWorkspace(workspaceId);
  }

  function scheduleSync() {
    clearTimeout(timer);
    if (disposed) return;
    timer = setTimeout(() => {
      syncAllWorkspaces();
      scheduleSync();
    }, SYNC_MS);
  }

  function createPillIcon(agentId: string) {
    return function AttentionPillIcon({
      size,
      color,
      theme,
      workspaceId,
    }: PluginButtonIconProps) {
      // Same push-driven store as contribute visibility — not the 15s Explorer query.
      const statuses = useAttentionStatuses(workspaceId);
      const items = useMemo(
        () => filterAttentionAgents(statuses, agentId),
        [statuses, agentId],
      );
      const tint = attentionPillTint(items);
      const iconColor =
        tint === "permission"
          ? theme.colors.statusWarning
          : tint === "error"
            ? theme.colors.statusDanger
            : tint === "finished"
              ? theme.colors.statusSuccess
              : color;
      return <Icon name={attentionPillIconName(tint)} size={size} color={iconColor} />;
    };
  }

  function addPill(agentId: string, workspaceId: string) {
    if (pills.has(agentId)) return;
    const entry: PillEntry = { workspaceId, signature: "" };
    entry.registration = client.addComposerPill({
      id: PILL_ID,
      workspaceId,
      agentId,
      button: {
        title: TITLE,
        label: TITLE,
        visible: false,
        icon: createPillIcon(agentId),
        behavior: {
          kind: "action",
          onPress() {
            /* replaced on first successful sync with peers */
          },
        },
      },
    });
    pills.set(agentId, entry);
    const cached = getAttentionStatuses(workspaceId);
    if (cached) applyPill(agentId, entry, cached);
    else void syncWorkspace(workspaceId);
  }

  function removePill(agentId: string) {
    pills.get(agentId)?.registration?.remove();
    pills.delete(agentId);
  }

  function onHostUpdate(update: HostAgentUpdate) {
    if (disposed) return;
    if (update.kind === "remove") {
      for (const workspaceId of [...new Set(
        [...pills.values()].map((entry) => entry.workspaceId),
      )]) {
        const map = getAttentionStatuses(workspaceId);
        if (!map || !(update.agentId in map)) continue;
        const next = { ...map };
        delete next[update.agentId];
        applyWorkspace(workspaceId, next);
      }
      return;
    }
    const workspaceId = update.agent.workspaceId;
    if (!workspaceId) return;
    const map = getAttentionStatuses(workspaceId);
    if (!map) {
      // Apply the push immediately so icon/visibility update without waiting for full poll.
      const next: Record<string, AgentStatusInfo> = {};
      applyAgentStatusUpdate(next, workspaceId, update);
      applyWorkspace(workspaceId, next);
      void syncWorkspace(workspaceId);
      return;
    }
    const next = { ...map };
    applyAgentStatusUpdate(next, workspaceId, update);
    applyWorkspace(workspaceId, next);
  }

  const unsubscribeDir = watchPillDirectory(client.paseo.agents, (agent) => {
    const { id, workspaceId } = agent;
    if (!workspaceId) return;
    addPill(id, workspaceId);
  }, removePill);

  const unsubscribePush = client.paseo.agents.subscribe((update) => {
    onHostUpdate(update as HostAgentUpdate);
  });

  scheduleSync();

  return () => {
    disposed = true;
    clearTimeout(timer);
    unsubscribeDir();
    unsubscribePush();
    pills.forEach((entry) => entry.registration?.remove());
    pills.clear();
    clearAttentionStatuses();
  };
}

/** Exported for tests / popover typing only. */
export type { AttentionAgentItem };
