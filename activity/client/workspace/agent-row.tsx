import { Icon } from "@getpaseo/plugin/client/react-native";
import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import type { AgentAttentionKind, WorkspaceTheme } from "./constants.ts";
import { RunningIndicator } from "./running-indicator.tsx";
import { CONTROL, ICON_SIZE } from "../design-tokens.ts";
import { useMessages } from "../use-app-language.ts";

export type AgentRowStyles = {
  agentListRow: ViewStyle;
  agentIconWrap: ViewStyle;
  runningBadge: ViewStyle;
  subAgentBadge: ViewStyle;
  subAgentBadgeText: TextStyle;
  listMain: ViewStyle;
  listLink: TextStyle;
  listTitle: TextStyle;
  listMeta: TextStyle;
  titleAction: ViewStyle;
  permissionBadge: ViewStyle;
  permissionBadgeText: TextStyle;
};

export function AgentRow({
  label,
  archived,
  canOpen,
  meta,
  permissionCount,
  attentionKind,
  running,
  subAgentCount = 0,
  busy,
  actionDisabled,
  theme,
  styles,
  onOpen,
  onArchiveToggle,
}: {
  label: string;
  archived: boolean;
  canOpen: boolean;
  meta: string | null;
  permissionCount: number;
  attentionKind: AgentAttentionKind;
  running: boolean;
  /** Direct child sessions; corner badge yields to running spinner. */
  subAgentCount?: number;
  busy: boolean;
  actionDisabled: boolean;
  theme: WorkspaceTheme;
  styles: AgentRowStyles;
  onOpen: () => void;
  /** Omit to hide the archive control (attention popover). */
  onArchiveToggle?: () => void;
}): ReactNode {
  const m = useMessages();
  const [hovered, setHovered] = useState(false);
  // Web: hover-reveal. Native has no hover — keep the action visible.
  // mouseenter/leave (not nested Pressable hover) so title/action don't flicker.
  const showAction = Platform.OS !== "web" || hovered || busy;
  const hoverProps =
    Platform.OS === "web"
      ? ({
          onMouseEnter: () => setHovered(true),
          onMouseLeave: () => setHovered(false),
        } as object)
      : null;

  const botColor =
    !archived && attentionKind === "error"
      ? theme.colors.statusDanger
      : !archived && attentionKind === "permission"
        ? theme.colors.statusWarning
        : !archived && attentionKind === "finished"
          ? theme.colors.statusSuccess
          : theme.colors.foregroundMuted;
  const stateLabels: string[] = [];
  if (!archived && running) stateLabels.push(m.workspace.state.running);
  if (subAgentCount > 0) stateLabels.push(m.workspace.state.subagents(subAgentCount));
  if (permissionCount > 0) stateLabels.push(m.workspace.state.permissions(permissionCount));
  if (!archived && attentionKind === "error") stateLabels.push(m.workspace.state.failed);
  if (!archived && attentionKind === "finished") stateLabels.push(m.workspace.state.finished);
  const stateSuffix = stateLabels.length > 0 ? `, ${stateLabels.join(", ")}` : "";
  const showRunning = running && !archived;
  const showSubAgentCount = !showRunning && subAgentCount > 0;
  const subAgentLabel = subAgentCount > 99 ? "99+" : String(subAgentCount);

  const body = (
    <>
      <View style={styles.agentIconWrap}>
        <Icon
          name={archived ? "BotOff" : "Bot"}
          size={ICON_SIZE.leading}
          color={botColor}
        />
        {showRunning ? (
          <View style={styles.runningBadge}>
            <RunningIndicator theme={theme} />
          </View>
        ) : showSubAgentCount ? (
          <View
            accessibilityLabel={m.workspace.state.subagents(subAgentCount)}
            style={styles.subAgentBadge}
          >
            <Text style={styles.subAgentBadgeText}>{subAgentLabel}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.listMain}>
        <Text style={canOpen ? styles.listLink : styles.listTitle} numberOfLines={1}>
          {label}
        </Text>
        {meta ? (
          <Text style={styles.listMeta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {permissionCount > 0 ? (
        <View
          accessibilityLabel={m.workspace.state.permissions(permissionCount)}
          style={styles.permissionBadge}
        >
          <Icon name="ShieldAlert" size={ICON_SIZE.badge} color={theme.colors.statusWarning} />
          {permissionCount > 1 ? (
            <Text style={styles.permissionBadgeText}>{permissionCount}</Text>
          ) : null}
        </View>
      ) : null}
      {onArchiveToggle ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={archived ? m.workspace.unarchive(label) : m.workspace.archive(label)}
          accessibilityState={{ disabled: actionDisabled }}
          disabled={actionDisabled || !showAction}
          hitSlop={CONTROL.hitSlop}
          onPress={onArchiveToggle}
          pointerEvents={showAction ? "auto" : "none"}
          style={[styles.titleAction, { opacity: showAction ? 1 : 0 }]}
        >
          {busy ? (
            <ActivityIndicator
              size={ICON_SIZE.inline}
              color={theme.colors.foregroundMuted}
              style={{ width: ICON_SIZE.inline, height: ICON_SIZE.inline }}
            />
          ) : (
            <Icon
              name={archived ? "ArchiveRestore" : "Archive"}
              size={ICON_SIZE.inline}
              color={theme.colors.foregroundMuted}
            />
          )}
        </Pressable>
      ) : null}
    </>
  );

  if (canOpen) {
    return (
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${m.common.openConversation(label)}${stateSuffix}`}
        onPress={onOpen}
        style={styles.agentListRow}
        {...hoverProps}
      >
        {body}
      </Pressable>
    );
  }

  return (
    <View style={styles.agentListRow} {...hoverProps}>
      {body}
    </View>
  );
}
