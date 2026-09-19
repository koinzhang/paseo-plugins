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
import type { WorkspaceTheme } from "./constants.ts";

export type AgentRowStyles = {
  agentListRow: ViewStyle;
  listMain: ViewStyle;
  listLink: TextStyle;
  listTitle: TextStyle;
  listMeta: TextStyle;
  titleAction: ViewStyle;
};

export function AgentRow({
  label,
  archived,
  canOpen,
  meta,
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
  busy: boolean;
  actionDisabled: boolean;
  theme: WorkspaceTheme;
  styles: AgentRowStyles;
  onOpen: () => void;
  onArchiveToggle: () => void;
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

  const body = (
    <>
      <Icon
        name={archived ? "BotOff" : "Bot"}
        size={18}
        color={theme.colors.foregroundMuted}
      />
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
    </>
  );

  if (canOpen) {
    return (
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Open conversation ${label}`}
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
