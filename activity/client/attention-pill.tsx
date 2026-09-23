import {
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
import { AttentionPopover } from "./attention-popover.tsx";
import { messagesFor } from "../shared/i18n.ts";
import { currentAppLanguage, watchAppLanguage } from "./use-app-language.ts";
import {
  clearAttentionStatuses,
  getAttentionStatuses,
  publishAttentionStatuses,
  useAttentionStatuses,
} from "./attention-status-store.ts";
import { watchAgentDirectory } from "./agent-directory.ts";
import { agentStatusInfo } from "./workspace/list-host-agents.ts";
import type { AgentStatusInfo } from "./workspace/constants.ts";

const attentionTitle = () => messagesFor(currentAppLanguage()).attention.title;
const PILL_ID = "attention";

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

/** Entry-owned directory drives pill registrations and attention, with 15s reconciliation. */
export function contributeAttentionPills(client: PluginClientContext): () => void {
  const pills = new Map<string, PillEntry>();
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
      pill.update({ visible: false, label: attentionTitle(), disabled: false });
      return;
    }

    // One shared pill for finished / permission / error; always the same popover list.
    pill.update({
      visible: true,
      label: String(items.length),
      title: attentionTitle(),
      disabled: false,
      behavior: {
        kind: "popover",
        Content: AttentionPopover,
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
        title: attentionTitle(),
        label: attentionTitle(),
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
  }

  function removePill(agentId: string) {
    pills.get(agentId)?.registration?.remove();
    pills.delete(agentId);
  }

  const stopDirectory = watchAgentDirectory(client.paseo.agents, (snapshot) => {
    const workspaces = new Map<string, Record<string, AgentStatusInfo>>();
    for (const [id, entry] of pills) {
      const agent = snapshot.get(id);
      if (!agent || agent.archivedAt || agent.workspaceId !== entry.workspaceId) removePill(id);
      workspaces.set(entry.workspaceId, {});
    }
    for (const agent of snapshot.values()) {
      if (agent.archivedAt || !agent.workspaceId) continue;
      const statuses = workspaces.get(agent.workspaceId) ?? {};
      statuses[agent.id] = agentStatusInfo(agent);
      workspaces.set(agent.workspaceId, statuses);
      addPill(agent.id, agent.workspaceId);
    }
    for (const [workspaceId, statuses] of workspaces) applyWorkspace(workspaceId, statuses);
  });

  const stopLanguage = watchAppLanguage(() => {
    for (const [agentId, entry] of pills) {
      entry.signature = "";
      const cached = getAttentionStatuses(entry.workspaceId);
      if (cached) applyPill(agentId, entry, cached);
    }
  });

  return () => {
    stopLanguage();
    stopDirectory();
    pills.forEach((entry) => entry.registration?.remove());
    pills.clear();
    clearAttentionStatuses();
  };
}

/** Exported for tests / popover typing only. */
export type { AttentionAgentItem };
