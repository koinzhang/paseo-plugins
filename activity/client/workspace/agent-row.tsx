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

export type AgentRowStyles = {
  agentListRow: ViewStyle;
  agentIconWrap: ViewStyle;
  runningBadge: ViewStyle;
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
  busy: boolean;
  actionDisabled: boolean;
  theme: WorkspaceTheme;
  styles: AgentRowStyles;
  onOpen: () => void;
  /** Omit to hide the archive control (attention popover). */
  onArchiveToggle?: () => void;
}): ReactNode {
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
  if (!archived && running) stateLabels.push("running");
  if (permissionCount > 0) {
    stateLabels.push(
      permissionCount === 1 ? "1 pending permission" : `${permissionCount} pending permissions`,
    );
  }
  if (!archived && attentionKind === "error") stateLabels.push("failed");
  if (!archived && attentionKind === "finished") stateLabels.push("turn finished, unread");
  const stateSuffix = stateLabels.length > 0 ? `, ${stateLabels.join(", ")}` : "";

  const body = (
    <>
      <View style={styles.agentIconWrap}>
        <Icon
          name={archived ? "BotOff" : "Bot"}
          size={18}
          color={botColor}
        />
        {running && !archived ? (
          <View style={styles.runningBadge}>
            <RunningIndicator theme={theme} />
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
          accessibilityLabel={
            permissionCount === 1 ? "1 pending permission" : `${permissionCount} pending permissions`
          }
          style={styles.permissionBadge}
        >
          <Icon name="ShieldAlert" size={12} color={theme.colors.statusWarning} />
          {permissionCount > 1 ? (
            <Text style={styles.permissionBadgeText}>{permissionCount}</Text>
          ) : null}
        </View>
      ) : null}
      {onArchiveToggle ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={archived ? `Unarchive ${label}` : `Archive ${label}`}
          accessibilityState={{ disabled: actionDisabled }}
          disabled={actionDisabled || !showAction}
          hitSlop={8}
          onPress={onArchiveToggle}
          pointerEvents={showAction ? "auto" : "none"}
          style={[styles.titleAction, { opacity: showAction ? 1 : 0 }]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={theme.colors.foregroundMuted} />
          ) : (
            <Icon
              name={archived ? "ArchiveRestore" : "Archive"}
              size={14}
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
        accessibilityLabel={`Open conversation ${label}${stateSuffix}`}
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
