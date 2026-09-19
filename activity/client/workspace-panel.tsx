import { type PluginWorkspacePanelProps, useRpc, useWorkspace } from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  type TextStyle,
} from "react-native";
import { ACTIVITY_LIST_LIMIT } from "../shared/insights.ts";
import {
  providerLabel,
  usageAgentsRpc,
  usageMcpByToolRpc,
  usageSkillsByNameRpc,
  usageSummaryRpc,
} from "../shared/usage.ts";
import { formatDisplayName, formatLocalDateTime } from "../shared/format.ts";
import { RANGE_OPTIONS, rangeFrom, type RangeId } from "./range.ts";
import { UsageStats } from "./usage-stats.tsx";

const AGENT_FILTERS: ReadonlyArray<{ id: "active" | "archived"; label: string }> = [
  { id: "active", label: "Active" },
  { id: "archived", label: "Archived" },
];

function CountText({
  value,
  styles,
}: {
  value: number | string;
  styles: { countText: TextStyle };
}): ReactNode {
  return <Text style={styles.countText}>{value}</Text>;
}

/** Workspace-scoped Activity for the Explorer (024). */
export function WorkspaceActivityPanel({
  theme,
  layout,
  workspaceId,
  navigation,
}: PluginWorkspacePanelProps) {
  const [range, setRange] = useState<RangeId>("all");
  const [agentFilter, setAgentFilter] = useState<"active" | "archived">("active");
  const padding = layout.compact ? 16 : 24;
  const workspaceName = useWorkspace(workspaceId, (workspace) => workspace.title ?? workspace.name);
  const openAgent = navigation?.openAgent;
  const from = rangeFrom(range);
  const window = from ? { from } : {};

  const summaryRpc = useRpc(usageSummaryRpc);
  const agentsRpc = useRpc(usageAgentsRpc);
  const skillsRpc = useRpc(usageSkillsByNameRpc);
  const mcpRpc = useRpc(usageMcpByToolRpc);

  const summary = useQuery({
    refetchInterval: 15_000,
    retry: false,
    queryKey: ["activity", "workspace-summary", workspaceId, from ?? "all"],
    queryFn: () => summaryRpc({ workspaceId, ...window }),
  });

  const agents = useQuery({
    refetchInterval: 15_000,
    retry: false,
    queryKey: ["activity", "workspace-agents", workspaceId, from ?? "all"],
    queryFn: () => agentsRpc({ workspaceId, ...window }),
  });

  const skills = useQuery({
    refetchInterval: 15_000,
    retry: false,
    queryKey: ["activity", "workspace-skills", workspaceId, from ?? "all"],
    queryFn: () => skillsRpc({ workspaceId, ...window }),
  });

  const mcp = useQuery({
    refetchInterval: 15_000,
    retry: false,
    queryKey: ["activity", "workspace-mcp", workspaceId, from ?? "all"],
    queryFn: () => mcpRpc({ workspaceId, ...window }),
  });

  const agentItems = agents.data?.items ?? [];
  const activeAgentItems = agentItems.filter((item) => item.archivedAt == null);
  const archivedAgentItems = agentItems.filter((item) => item.archivedAt != null);
  const visibleAgentItems =
    agentFilter === "archived" ? archivedAgentItems : activeAgentItems;
  const allSkills = useMemo(
    () => (skills.data?.items ?? []).filter((item) => item.total > 0),
    [skills.data],
  );
  const allMcp = mcp.data?.items ?? [];
  const skillItems = useMemo(() => allSkills.slice(0, ACTIVITY_LIST_LIMIT), [allSkills]);
  const mcpItems = useMemo(() => allMcp.slice(0, ACTIVITY_LIST_LIMIT), [allMcp]);

  const loading =
    summary.isLoading || agents.isLoading || skills.isLoading || mcp.isLoading;
  const error = summary.error ?? agents.error ?? skills.error ?? mcp.error;

  const kpi = [
    {
      label: "Skill calls",
      value: allSkills.reduce((sum, item) => sum + item.total, 0).toLocaleString(),
    },
    {
      label: "MCP calls",
      value: allMcp.reduce((sum, item) => sum + item.count, 0).toLocaleString(),
    },
    { label: "Shell calls", value: (summary.data?.shellCalls ?? 0).toLocaleString() },
    { label: "File reads", value: (summary.data?.fileReads ?? 0).toLocaleString() },
    { label: "File writes", value: (summary.data?.fileWrites ?? 0).toLocaleString() },
    {
      label: "Messages",
      value: agentItems.reduce((sum, item) => sum + item.messageCount, 0).toLocaleString(),
    },
    { label: "Agents", value: String(agentItems.length) },
  ];

  const showAgents = agentItems.length > 0;
  const showSkills = skillItems.length > 0;
  const showMcp = mcpItems.length > 0;
  const showContent = showAgents || showSkills || showMcp;

  const styles = useMemo(
    () => ({
      screen: { flex: 1, backgroundColor: theme.colors.surface0 },
      content: {
        padding,
        paddingBottom: padding + 24,
        gap: layout.compact ? 20 : 26,
        maxWidth: 1000,
        width: "100%" as const,
        alignSelf: "center" as const,
      },
      headerRow: {
        flexDirection: "row" as const,
        alignItems: "baseline" as const,
        justifyContent: "space-between" as const,
        flexWrap: "wrap" as const,
        gap: 12,
      },
      header: {
        flexDirection: "row" as const,
        alignItems: "baseline" as const,
        gap: 8,
        flexShrink: 1,
        minWidth: 0,
      },
      headerMeta: {
        color: theme.colors.foregroundMuted,
        fontSize: 12,
        flexShrink: 1,
      },
      sectionHeaderRow: {
        flexDirection: "row" as const,
        alignItems: "baseline" as const,
        justifyContent: "space-between" as const,
        flexWrap: "wrap" as const,
        gap: 12,
      },
      sectionTitle: {
        color: theme.colors.foreground,
        fontSize: layout.compact ? 18 : 20,
        fontWeight: "600" as const,
        flexShrink: 1,
        letterSpacing: -0.3,
      },
      rangeBar: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        flexWrap: "wrap" as const,
        gap: layout.compact ? 12 : 16,
      },
      rangeSegment: {
        paddingVertical: 6,
      },
      chipText: {
        color: theme.colors.foregroundMuted,
        fontSize: 14,
        fontWeight: "500" as const,
      },
      chipTextActive: {
        color: theme.colors.foreground,
        fontSize: 14,
        fontWeight: "600" as const,
      },
      panel: {
        gap: 4,
        overflow: "hidden" as const,
      },
      listRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 12,
        paddingVertical: 12,
      },
      listMain: {
        flex: 1,
        minWidth: 0,
        gap: 3,
      },
      listTitle: {
        color: theme.colors.foreground,
        fontSize: 14,
        fontWeight: "500" as const,
      },
      listLink: {
        color: theme.colors.foreground,
        fontSize: 14,
        fontWeight: "500" as const,
      },
      listMeta: {
        color: theme.colors.foregroundMuted,
        fontSize: 12,
      },
      countText: {
        color: theme.colors.foregroundMuted,
        fontSize: 13,
        fontVariant: ["tabular-nums" as const],
        minWidth: 24,
        textAlign: "right" as const,
      },
      empty: {
        color: theme.colors.foregroundMuted,
        fontSize: 13,
      },
    }),
    [theme, layout.compact, padding],
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.header}>
          {!layout.compact ? <Text style={styles.sectionTitle}>Activity</Text> : null}
          <Text style={styles.headerMeta} numberOfLines={1}>
            {workspaceName ?? workspaceId}
          </Text>
        </View>
        <View style={styles.rangeBar}>
          {RANGE_OPTIONS.map((option) => {
            const active = range === option.id;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setRange(option.id)}
                style={styles.rangeSegment}
              >
                <Text style={active ? styles.chipTextActive : styles.chipText}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {loading ? <ActivityIndicator color={theme.colors.accent} /> : null}
      {error ? (
        <Text style={{ color: theme.colors.statusDanger }}>
          {error instanceof Error ? error.message : String(error)}
        </Text>
      ) : null}

      {!loading && !error && !showContent ? (
        <Text style={styles.empty}>No activity in this workspace yet</Text>
      ) : null}

      {!loading && !error && showContent ? (
        <UsageStats items={kpi} colors={theme.colors} compact={layout.compact} dense />
      ) : null}

      {showAgents ? (
        <View style={{ gap: 12 }}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Agents</Text>
            <View style={styles.rangeBar}>
              {AGENT_FILTERS.map((option) => {
                const active = agentFilter === option.id;
                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    onPress={() => setAgentFilter(option.id)}
                    style={styles.rangeSegment}
                  >
                    <Text style={active ? styles.chipTextActive : styles.chipText}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={styles.panel}>
            {visibleAgentItems.map((item) => {
              const label = item.title ?? item.agentId;
              const activity = item.callCount + item.messageCount;
              const canOpen = openAgent != null && item.archivedAt == null;
              return (
                <View key={item.agentId} style={styles.listRow}>
                  <Icon name="Bot" size={18} color={theme.colors.foregroundMuted} />
                  <View style={styles.listMain}>
                    {canOpen ? (
                      <Pressable
                        accessibilityRole="link"
                        accessibilityLabel={`Open conversation ${label}`}
                        onPress={() => openAgent?.({ agentId: item.agentId })}
                      >
                        <Text style={styles.listLink} numberOfLines={1}>
                          {label}
                        </Text>
                      </Pressable>
                    ) : (
                      <Text style={styles.listTitle} numberOfLines={1}>
                        {label}
                      </Text>
                    )}
                    <Text style={styles.listMeta} numberOfLines={1}>
                      {providerLabel(item.provider)} · {item.callCount} calls · {item.messageCount}{" "}
                      messages
                      {item.archivedAt ? ` · Archived ${formatLocalDateTime(item.archivedAt)}` : ""}
                    </Text>
                  </View>
                  <CountText value={activity} styles={styles} />
                </View>
              );
            })}
            {visibleAgentItems.length === 0 ? (
              <Text style={styles.empty}>
                {agentFilter === "archived" ? "No archived agents" : "No active agents"}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {showSkills ? (
        <View style={{ gap: 12 }}>
          <Text style={styles.sectionTitle}>Skills</Text>
          <View style={styles.panel}>
            {skillItems.map((item) => (
              <View key={item.skillName} style={styles.listRow}>
                <Icon name="Sparkles" size={18} color={theme.colors.foregroundMuted} />
                <View style={styles.listMain}>
                  <Text style={styles.listTitle} numberOfLines={1}>
                    {formatDisplayName(item.skillName)}
                  </Text>
                  <Text style={styles.listMeta}>Last {formatLocalDateTime(item.lastUsedAt)}</Text>
                </View>
                <CountText value={item.total} styles={styles} />
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {showMcp ? (
        <View style={{ gap: 12 }}>
          <Text style={styles.sectionTitle}>MCP</Text>
          <View style={styles.panel}>
            {mcpItems.map((item) => (
              <View key={`${item.server}.${item.tool}`} style={styles.listRow}>
                <Icon name="Plug" size={18} color={theme.colors.foregroundMuted} />
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
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}
