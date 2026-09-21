import { Icon } from "@getpaseo/plugin/client/react-native";
import type { ReactNode } from "react";
import { Pressable, Text, View, type TextStyle, type ViewStyle } from "react-native";
import { formatDisplayName } from "../../shared/format.ts";
import type {
  McpByToolItem,
  RecentMcpCallItem,
  RecentSkillCallItem,
  SkillByNameItem,
} from "../../shared/usage.ts";
import { FormattedTime } from "../formatted-time.tsx";
import { RANK_ROW_ESTIMATE } from "./constants.ts";

type RankKind = "skills" | "mcp";
export type RankView = "ranked" | "timeline";

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
  headerActions: ViewStyle;
  panel: ViewStyle;
  listRow: ViewStyle;
  timelineMarker: ViewStyle;
  timelineLineTop: ViewStyle;
  timelineLineBottom: ViewStyle;
  timelineDot: ViewStyle;
  listMain: ViewStyle;
  listTitle: TextStyle;
  listMeta: TextStyle;
  countText: TextStyle;
  empty: TextStyle;
};

export function RankSection({
  rankKind,
  onToggleKind,
  rankView,
  onToggleRankView,
  showToggle = true,
  skillItems,
  recentSkillCalls,
  mcpItems,
  recentMcpCalls,
  archivedAgentIds,
  openAgent,
  activeAgentColor,
  archivedAgentColor,
  mutedColor,
  styles,
}: {
  rankKind: RankKind;
  onToggleKind: () => void;
  rankView: RankView;
  onToggleRankView: () => void;
  showToggle?: boolean;
  skillItems: ReadonlyArray<SkillByNameItem>;
  recentSkillCalls: ReadonlyArray<RecentSkillCallItem>;
  mcpItems: ReadonlyArray<McpByToolItem>;
  recentMcpCalls: ReadonlyArray<RecentMcpCallItem>;
  archivedAgentIds: ReadonlySet<string>;
  openAgent?: (input: { agentId: string }) => void;
  activeAgentColor: string;
  archivedAgentColor: string;
  mutedColor: string;
  styles: RankSectionStyles;
}): ReactNode {
  if (skillItems.length === 0 && mcpItems.length === 0) return null;

  const items =
    rankView === "timeline"
      ? rankKind === "skills"
        ? recentSkillCalls
        : recentMcpCalls
      : rankKind === "skills"
        ? skillItems
        : mcpItems;

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>{rankTitle(rankKind)}</Text>
        <View style={styles.headerActions}>
          {showToggle ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={rankAction(rankKind).accessibilityLabel}
              hitSlop={8}
              onPress={onToggleKind}
              style={styles.titleAction}
            >
              <Icon name={rankAction(rankKind).icon} size={16} color={mutedColor} />
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              rankView === "ranked"
                ? `Show ${rankTitle(rankKind)} as a timeline`
                : `Show ${rankTitle(rankKind)} ranked by calls`
            }
            hitSlop={8}
            onPress={onToggleRankView}
            style={styles.titleAction}
          >
            <Icon
              name={rankView === "ranked" ? "GitCommitVertical" : "LayoutList"}
              size={16}
              color={mutedColor}
            />
          </Pressable>
        </View>
      </View>
      <View
        style={[
          styles.panel,
          {
            minHeight: Math.max(items.length, 1) * RANK_ROW_ESTIMATE,
          },
        ]}
      >
        {rankKind === "skills" && rankView === "timeline"
          ? recentSkillCalls.map((item, index) => {
              const canOpen = openAgent != null && !archivedAgentIds.has(item.agentId);
              return (
                <Pressable
                  key={`${item.agentId}:${item.callId}`}
                  accessibilityRole={canOpen ? "link" : undefined}
                  accessibilityLabel={
                    canOpen ? `Open conversation ${item.agentTitle ?? item.agentId}` : undefined
                  }
                  accessibilityState={{ disabled: !canOpen }}
                  disabled={!canOpen}
                  onPress={canOpen ? () => openAgent({ agentId: item.agentId }) : undefined}
                  style={styles.listRow}
                >
                  <View style={styles.timelineMarker}>
                    {index > 0 ? <View style={styles.timelineLineTop} /> : null}
                    <View
                      style={[
                        styles.timelineDot,
                        {
                          backgroundColor: archivedAgentIds.has(item.agentId)
                            ? archivedAgentColor
                            : activeAgentColor,
                        },
                      ]}
                    />
                    {index < recentSkillCalls.length - 1 ? (
                      <View style={styles.timelineLineBottom} />
                    ) : null}
                  </View>
                  <View style={styles.listMain}>
                    <Text style={styles.listTitle} numberOfLines={1}>
                      {formatDisplayName(item.skillName)}
                    </Text>
                    <Text style={styles.listMeta} numberOfLines={1}>
                      {item.agentTitle ?? item.agentId}
                    </Text>
                  </View>
                  <FormattedTime iso={item.calledAt} style={styles.listMeta} />
                </Pressable>
              );
            })
          : rankKind === "mcp" && rankView === "timeline"
            ? recentMcpCalls.map((item, index) => {
                const canOpen = openAgent != null && !archivedAgentIds.has(item.agentId);
                return (
                  <Pressable
                    key={`${item.agentId}:${item.callId}`}
                    accessibilityRole={canOpen ? "link" : undefined}
                    accessibilityLabel={
                      canOpen ? `Open conversation ${item.agentTitle ?? item.agentId}` : undefined
                    }
                    accessibilityState={{ disabled: !canOpen }}
                    disabled={!canOpen}
                    onPress={canOpen ? () => openAgent({ agentId: item.agentId }) : undefined}
                    style={styles.listRow}
                  >
                    <View style={styles.timelineMarker}>
                      {index > 0 ? <View style={styles.timelineLineTop} /> : null}
                      <View
                        style={[
                          styles.timelineDot,
                          {
                            backgroundColor: archivedAgentIds.has(item.agentId)
                              ? archivedAgentColor
                              : activeAgentColor,
                          },
                        ]}
                      />
                      {index < recentMcpCalls.length - 1 ? (
                        <View style={styles.timelineLineBottom} />
                      ) : null}
                    </View>
                    <View style={styles.listMain}>
                      <Text style={styles.listTitle} numberOfLines={1}>
                        {formatDisplayName(`${item.server}.${item.tool}`)}
                      </Text>
                      <Text style={styles.listMeta} numberOfLines={1}>
                        {item.agentTitle ?? item.agentId}
                      </Text>
                    </View>
                    <FormattedTime iso={item.calledAt} style={styles.listMeta} />
                  </Pressable>
                );
              })
          : rankKind === "skills"
            ? skillItems.map((item) => (
              <View key={item.skillName} style={styles.listRow}>
                <Icon name="Sparkles" size={18} color={mutedColor} />
                <View style={styles.listMain}>
                  <Text style={styles.listTitle} numberOfLines={1}>
                    {formatDisplayName(item.skillName)}
                  </Text>
                  <FormattedTime
                    iso={item.lastUsedAt}
                    prefix="Last "
                    style={styles.listMeta}
                  />
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
                  {item.failures > 0 ? (
                    <Text style={styles.listMeta}>{item.failures} failed</Text>
                  ) : item.lastUsedAt ? (
                    <FormattedTime
                      iso={item.lastUsedAt}
                      prefix="Last "
                      style={styles.listMeta}
                    />
                  ) : (
                    <Text style={styles.listMeta}>—</Text>
                  )}
                </View>
                <CountText value={item.count} styles={styles} />
              </View>
            ))}
      </View>
    </View>
  );
}
