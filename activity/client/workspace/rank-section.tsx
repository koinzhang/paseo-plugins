import { Icon } from "@getpaseo/plugin/client/react-native";
import type { ReactNode } from "react";
import { Pressable, Text, View, type TextStyle, type ViewStyle } from "react-native";
import { formatDisplayName, formatLocalDateTime } from "../../shared/format.ts";
import type { McpByToolItem, SkillByNameItem } from "../../shared/usage.ts";
import { RANK_ROW_ESTIMATE } from "./constants.ts";

type RankKind = "skills" | "mcp";

function rankTitle(kind: RankKind): string {
  return kind === "skills" ? "Skills" : "MCP";
}

function rankAction(kind: RankKind): { icon: "Sparkles" | "Plug"; accessibilityLabel: string } {
  return kind === "skills"
    ? { icon: "Plug", accessibilityLabel: "Show most used MCP" }
    : { icon: "Sparkles", accessibilityLabel: "Show most used skills" };
}

function CountText({
  value,
  styles,
}: {
  value: number | string;
  styles: { countText: TextStyle };
}): ReactNode {
  return <Text style={styles.countText}>{value}</Text>;
}

export type RankSectionStyles = {
  sectionHeaderRow: ViewStyle;
  sectionTitle: TextStyle;
  titleAction: ViewStyle;
  panel: ViewStyle;
  listRow: ViewStyle;
  listMain: ViewStyle;
  listTitle: TextStyle;
  listMeta: TextStyle;
  countText: TextStyle;
  empty: TextStyle;
};

export function RankSection({
  rankKind,
  onToggleKind,
  skillItems,
  mcpItems,
  mutedColor,
  styles,
}: {
  rankKind: RankKind;
  onToggleKind: () => void;
  skillItems: ReadonlyArray<SkillByNameItem>;
  mcpItems: ReadonlyArray<McpByToolItem>;
  mutedColor: string;
  styles: RankSectionStyles;
}): ReactNode {
  return (
    <View style={{ gap: 12 }}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>{rankTitle(rankKind)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={rankAction(rankKind).accessibilityLabel}
          hitSlop={8}
          onPress={onToggleKind}
          style={styles.titleAction}
        >
          <Icon name={rankAction(rankKind).icon} size={16} color={mutedColor} />
        </Pressable>
      </View>
      <View
        style={[
          styles.panel,
          {
            minHeight: Math.max(skillItems.length, mcpItems.length, 1) * RANK_ROW_ESTIMATE,
          },
        ]}
      >
        {rankKind === "skills"
          ? skillItems.map((item) => (
              <View key={item.skillName} style={styles.listRow}>
                <Icon name="Sparkles" size={18} color={mutedColor} />
                <View style={styles.listMain}>
                  <Text style={styles.listTitle} numberOfLines={1}>
                    {formatDisplayName(item.skillName)}
                  </Text>
                  <Text style={styles.listMeta}>
                    Last {formatLocalDateTime(item.lastUsedAt)}
                  </Text>
                </View>
                <CountText value={item.total} styles={styles} />
              </View>
            ))
          : mcpItems.map((item) => (
              <View key={`${item.server}.${item.tool}`} style={styles.listRow}>
                <Icon name="Plug" size={18} color={mutedColor} />
                <View style={styles.listMain}>
                  <Text style={styles.listTitle} numberOfLines={1}>
                    {formatDisplayName(`${item.server}.${item.tool}`)}
                  </Text>
                  <Text style={styles.listMeta}>
                    {item.failures > 0
                      ? `${item.failures} failed`
                      : item.lastUsedAt
                        ? `Last ${formatLocalDateTime(item.lastUsedAt)}`
                        : "—"}
                  </Text>
                </View>
                <CountText value={item.count} styles={styles} />
              </View>
            ))}
        {(rankKind === "skills" ? skillItems.length : mcpItems.length) === 0 ? (
          <Text style={styles.empty}>
            {rankKind === "skills" ? "No skills yet" : "No MCP yet"}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
