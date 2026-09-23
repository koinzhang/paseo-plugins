import { usePaseo } from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { collapseHomePath } from "../../shared/home-path.ts";
import { TERMINAL_PREVIEW_LINES, TERMINAL_REFETCH_MS } from "./constants.ts";
import { terminalPreviewLines } from "./terminal-preview.ts";
import { CONTROL, ICON_SIZE } from "../design-tokens.ts";
import { useMessages } from "../use-app-language.ts";

export type TerminalListItem = {
  id: string;
  workspaceId: string;
  cwd: string;
  name: string;
};

export type TerminalsSectionStyles = {
  section: ViewStyle;
  sectionHeaderRow: ViewStyle;
  sectionTitle: TextStyle;
  panel: ViewStyle;
  terminalRow: ViewStyle;
  listMain: ViewStyle;
  listTitle: TextStyle;
  listMeta: TextStyle;
  titleAction: ViewStyle;
  terminalPreview: ViewStyle;
  terminalLine: TextStyle;
};

export function TerminalsSection({
  workspaceId,
  terminalItems,
  busyTerminalId,
  homeDir,
  mutedColor,
  styles,
  onClose,
}: {
  workspaceId: string;
  terminalItems: ReadonlyArray<TerminalListItem>;
  busyTerminalId: string | null;
  homeDir?: string;
  mutedColor: string;
  styles: TerminalsSectionStyles;
  onClose: (item: TerminalListItem) => void;
}): ReactNode {
  const m = useMessages();
  const paseo = usePaseo();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    if (expandedId != null && !terminalItems.some((item) => item.id === expandedId)) {
      setExpandedId(null);
    }
  }, [expandedId, terminalItems]);

  const capture = useQuery({
    enabled: expandedId != null,
    refetchInterval: TERMINAL_REFETCH_MS,
    retry: false,
    queryKey: ["activity", "terminal-capture", workspaceId, expandedId],
    queryFn: async () => {
      const result = await paseo.terminals
        .ref(expandedId as string)
        .capture({ stripAnsi: true });
      return terminalPreviewLines(result.lines, TERMINAL_PREVIEW_LINES);
    },
  });

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>{m.workspace.terminals}</Text>
      </View>
      <View style={styles.panel}>
        {terminalItems.map((item) => {
          const expanded = item.id === expandedId;
          const busy = busyTerminalId === item.id;
          // Web: hover-reveal. Native has no hover — keep the action visible.
          const showClose = Platform.OS !== "web" || hoveredId === item.id || busy;
          const lines = expanded ? (capture.data ?? []) : [];
          return (
            <View key={item.id}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  expanded ? m.workspace.hideOutput(item.name) : m.workspace.showOutput(item.name)
                }
                accessibilityState={{ expanded }}
                onPress={() => setExpandedId(expanded ? null : item.id)}
                style={styles.terminalRow}
                {...(Platform.OS === "web"
                  ? ({
                      onMouseEnter: () => setHoveredId(item.id),
                      onMouseLeave: () =>
                        setHoveredId((prev) => (prev === item.id ? null : prev)),
                    } as object)
                  : null)}
              >
                <Icon name="Terminal" size={ICON_SIZE.leading} color={mutedColor} />
                <View style={styles.listMain}>
                  <Text style={styles.listTitle} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.listMeta} numberOfLines={1}>
                    {collapseHomePath(item.cwd, homeDir ?? "")}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={m.workspace.closeTerminal(item.name)}
                  accessibilityState={{ disabled: busyTerminalId != null }}
                  disabled={busyTerminalId != null || !showClose}
                  hitSlop={CONTROL.hitSlop}
                  onPress={() => onClose(item)}
                  pointerEvents={showClose ? "auto" : "none"}
                  style={[styles.titleAction, { opacity: showClose ? 1 : 0 }]}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color={mutedColor} />
                  ) : (
                    <Icon name="X" size={ICON_SIZE.inline} color={mutedColor} />
                  )}
                </Pressable>
              </Pressable>
              {expanded ? (
                <View style={styles.terminalPreview}>
                  {capture.isPending ? (
                    <Text style={styles.listMeta}>{m.common.loading}</Text>
                  ) : lines.length === 0 ? (
                    <Text style={styles.listMeta}>{m.workspace.noOutput}</Text>
                  ) : (
                    lines.map((line, index) => (
                      <Text key={index} style={styles.terminalLine} numberOfLines={1}>
                        {line.length > 0 ? line : " "}
                      </Text>
                    ))
                  )}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
