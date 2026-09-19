import {
  type PluginButtonContentProps,
  type PluginButtonIconProps,
  type PluginButtonRegistration,
  type PluginClientContext,
} from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { useEffect, useRef } from "react";
import { formatUsagePillLabel } from "../shared/usage.ts";
import { useUsagePillData, clearPillDataCache } from "./usage-query.tsx";
import { UsagePopover, type SkillDetail } from "./usage-popover.tsx";
import { requestOpenSkillInPanel } from "./pending-skill.ts";

/** Accessible name; also the label while counts load (skills-plugin pattern). */
const TITLE = "Activity";

/**
 * Keep the icon mounted while empty so refetchInterval can catch post-turn ingest.
 * First visit: longer window. After a settled empty hide: shorter (idle remount).
 */
const EMPTY_GRACE_MS_INITIAL = 12_000;
const EMPTY_GRACE_MS_RECHECK = 4_000;

type PillEntry = {
  registration?: PluginButtonRegistration;
  /** Host unmounted the icon after a settled empty hide. */
  hidden: boolean;
  /** Already completed one empty grace → hide cycle for this agent. */
  settledEmpty: boolean;
};

function applyPillLabel(pill: PluginButtonRegistration, label: string | null) {
  if (label === null) {
    // Still loading — keep a stable visible title so the icon can mount.
    pill.update({ label: TITLE, visible: true });
    return;
  }
  if (label.length === 0) {
    // Caller decides when to hide after grace; keep title while polling.
    pill.update({ label: TITLE, visible: true });
    return;
  }
  pill.update({ label, visible: true });
}

function createPillIcon(agentId: string, entry: PillEntry) {
  return function UsagePillIcon({ size, color }: PluginButtonIconProps) {
    const query = useUsagePillData(agentId);
    const emptySinceRef = useRef<number | null>(null);

    // null = loading or error (keep title); "" = loaded empty; otherwise top-skill badge.
    const label = query.data
      ? formatUsagePillLabel(
          undefined,
          query.data.skills,
          query.data.mcpTools,
        )
      : query.isError
        ? TITLE
        : null;

    useEffect(() => {
      const pill = entry.registration;
      if (!pill) return;

      if (query.isError) {
        console.error("[activity] pill query failed", agentId, query.error);
        emptySinceRef.current = null;
        entry.hidden = false;
        // Stay visible with title so the user can still open the popover.
        pill.update({ label: TITLE, visible: true });
        return;
      }

      if (label === null) {
        emptySinceRef.current = null;
        applyPillLabel(pill, null);
        return;
      }

      if (label.length > 0) {
        emptySinceRef.current = null;
        entry.hidden = false;
        entry.settledEmpty = false;
        applyPillLabel(pill, label);
        return;
      }

      // Loaded empty — stay mounted and poll until grace elapses.
      const now = Date.now();
      if (emptySinceRef.current === null) emptySinceRef.current = now;
      applyPillLabel(pill, "");

      const graceMs = entry.settledEmpty ? EMPTY_GRACE_MS_RECHECK : EMPTY_GRACE_MS_INITIAL;
      const remaining = graceMs - (now - emptySinceRef.current);
      if (remaining <= 0) {
        entry.hidden = true;
        entry.settledEmpty = true;
        // Hide without clearing title (avoids host error chrome).
        pill.update({ visible: false });
        return;
      }

      const timer = setTimeout(() => {
        if (emptySinceRef.current === null) return;
        if (Date.now() - emptySinceRef.current < graceMs) return;
        entry.hidden = true;
        entry.settledEmpty = true;
        pill.update({ visible: false });
      }, remaining);

      return () => clearTimeout(timer);
    }, [entry, label, query.isError, query.error, agentId]);

    return <Icon name="Activity" size={size} color={color} />;
  };
}

export function contributePills(client: PluginClientContext) {
  const pills = new Map<string, PillEntry>();

  function UsagePopoverContent(props: PluginButtonContentProps) {
    return (
      <UsagePopover
        {...props}
        openSkillInPanel={(skill: SkillDetail) => {
          if (props.context !== "agent") return;
          requestOpenSkillInPanel({
            agentId: props.agentId,
            skillName: skill.skillName,
            path: skill.path,
          });
          // Same entry as Skills pill: open the agent workspace panel.
          client.openPanel("usage", {
            workspaceId: props.workspaceId,
            agentId: props.agentId,
          });
        }}
      />
    );
  }

  function addPill(agentId: string, workspaceId: string) {
    // Agent updates fire every turn — do not re-register (unmounts icon / refires query).
    if (pills.has(agentId)) return;

    const entry: PillEntry = { hidden: false, settledEmpty: false };
    entry.registration = client.addComposerPill({
      id: "usage",
      workspaceId,
      agentId,
      button: {
        title: TITLE,
        label: TITLE,
        visible: true,
        icon: createPillIcon(agentId, entry),
        behavior: {
          kind: "popover",
          Content: UsagePopoverContent,
        },
      },
    });
    pills.set(agentId, entry);
  }

  function removePill(agentId: string) {
    pills.get(agentId)?.registration?.remove();
    pills.delete(agentId);
    clearPillDataCache(agentId);
  }

  /** Remount a previously hidden pill so icon can re-query after turn_ended ingest. */
  function reviveHiddenPill(agentId: string) {
    const entry = pills.get(agentId);
    if (!entry?.hidden || !entry.registration) return;
    entry.hidden = false;
    entry.registration.update({ label: TITLE, visible: true });
  }

  const unsubscribe = client.paseo.agents.subscribe((update) => {
    if (update.kind === "remove") {
      removePill(update.agentId);
      return;
    }
    const { id, workspaceId, status } = update.agent;
    if (!workspaceId) return;
    if (pills.has(id)) {
      // turn_ended ingest races with idle; remount hidden pills so they can catch up.
      if (status === "idle") reviveHiddenPill(id);
      return;
    }
    addPill(id, workspaceId);
  });

  client.paseo.agents
    .list()
    .then((result) => {
      result.entries.forEach(({ agent }) => {
        if (agent.workspaceId) addPill(agent.id, agent.workspaceId);
      });
    })
    .catch((error: unknown) => {
      console.error("[activity] could not seed composer pills", error);
    });

  return () => {
    unsubscribe();
    pills.forEach((entry) => entry.registration?.remove());
    pills.clear();
  };
}
