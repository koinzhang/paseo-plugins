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
import { ICON_SIZE } from "../design-tokens.ts";
import { useMessages } from "../use-app-language.ts";
import { CountText, IconButton, SectionHeader } from "../ui.tsx";

type RankKind = "skills" | "mcp";
export type RankView = "ranked" | "timeline";


export type RankSectionStyles = {
  section: ViewStyle;
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
  activeTitleColor,
  compact,
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
  activeTitleColor: string;
  compact: boolean;
  styles: RankSectionStyles;
}): ReactNode {
  const m = useMessages();
  if (skillItems.length === 0 && mcpItems.length === 0) return null;
  const title = rankKind === "skills" ? m.common.skills : m.common.mcp;

  const items =
    rankView === "timeline"
      ? rankKind === "skills"
        ? recentSkillCalls
        : recentMcpCalls
      : rankKind === "skills"
        ? skillItems
        : mcpItems;

  return (
    <View style={styles.section}>
      <SectionHeader title={title} colors={{ foreground: activeTitleColor, foregroundMuted: mutedColor }} compact={compact}>
        {showToggle ? (
          <IconButton
            icon={rankKind === "skills" ? "Plug" : "Sparkles"}
            label={rankKind === "skills" ? m.global.rankShow.mcp : m.global.rankShow.skills}
            onPress={onToggleKind}
            color={mutedColor}
          />
        ) : null}
        <IconButton
          icon={rankView === "ranked" ? "GitCommitVertical" : "LayoutList"}
          label={rankView === "ranked" ? m.workspace.showTimeline(title) : m.workspace.showRanked(title)}
          onPress={onToggleRankView}
          color={mutedColor}
        />
      </SectionHeader>
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
                    canOpen ? m.common.openConversation(item.agentTitle ?? item.agentId) : undefined
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
                      canOpen ? m.common.openConversation(item.agentTitle ?? item.agentId) : undefined
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
                <Icon name="Sparkles" size={ICON_SIZE.leading} color={mutedColor} />
                <View style={styles.listMain}>
                  <Text style={styles.listTitle} numberOfLines={1}>
                    {formatDisplayName(item.skillName)}
                  </Text>
                  <FormattedTime
                    iso={item.lastUsedAt}
                    format={m.common.lastUsed}
                    style={styles.listMeta}
                  />
                </View>
                <CountText value={item.total} color={mutedColor} />
              </View>
              ))
            : mcpItems.map((item) => (
              <View key={`${item.server}.${item.tool}`} style={styles.listRow}>
                <Icon name="Plug" size={ICON_SIZE.leading} color={mutedColor} />
                <View style={styles.listMain}>
                  <Text style={styles.listTitle} numberOfLines={1}>
                    {formatDisplayName(`${item.server}.${item.tool}`)}
                  </Text>
                  {item.failures > 0 ? (
                    <Text style={styles.listMeta}>{m.common.failed(item.failures)}</Text>
                  ) : item.lastUsedAt ? (
                    <FormattedTime
                      iso={item.lastUsedAt}
                      format={m.common.lastUsed}
                      style={styles.listMeta}
                    />
                  ) : (
                    <Text style={styles.listMeta}>—</Text>
                  )}
                </View>
                <CountText value={item.count} color={mutedColor} />
              </View>
            ))}
      </View>
    </View>
  );
}
