import { type PluginAgentPanelProps, useAgent, useRpc } from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  type TextStyle,
} from "react-native";
import {
  usageMcpByToolRpc,
  usageReadSkillRpc,
  usageSkillsByNameRpc,
  usageSummaryRpc,
} from "../shared/usage.ts";
import { formatDisplayName, formatLocalDateTime } from "../shared/format.ts";
import {
  clearPendingSkillOpen,
  consumePendingSkillOpen,
  subscribePendingSkillOpen,
} from "./pending-skill.ts";

import { UsageStats } from "./usage-stats.tsx";

type TabId = "skills" | "mcp";

type SkillDetail = {
  skillName: string;
  path: string;
};

const MONO = Platform.select({ ios: "Menlo", default: "monospace" });

function CountText({
  value,
  styles,
}: {
  value: number | string;
  styles: { countText: TextStyle };
}): ReactNode {
  return <Text style={styles.countText}>{value}</Text>;
}

export function UsagePanel({ theme, layout, agentId, navigation }: PluginAgentPanelProps) {
  const [tab, setTab] = useState<TabId | null>(null);
  const [skillDetail, setSkillDetail] = useState<SkillDetail | null>(null);
  const padding = layout.compact ? 16 : 28;
  const agentTitle = useAgent(agentId, (agent) => agent.title);
  const openAgent = navigation?.openAgent;
  const conversationLabel = agentTitle ?? agentId;

  const skillsByNameRpc = useRpc(usageSkillsByNameRpc);
  const mcpByToolRpc = useRpc(usageMcpByToolRpc);
  const summaryRpc = useRpc(usageSummaryRpc);
  const readSkillRpc = useRpc(usageReadSkillRpc);

  useEffect(() => {
    function applyPending() {
      const pending = consumePendingSkillOpen(agentId);
      if (!pending) return;
      setSkillDetail({ skillName: pending.skillName, path: pending.path });
      setTab("skills");
      // Delay clear so openPanel / Strict Mode remount can still read the same pending.
      setTimeout(() => clearPendingSkillOpen(agentId, pending), 1_000);
    }
    applyPending();
    return subscribePendingSkillOpen(applyPending);
  }, [agentId]);

  const skillsByName = useQuery({
    refetchInterval: 15_000,
    queryKey: ["activity", "skills-by-name", agentId],
    queryFn: () => skillsByNameRpc({ agentId }),
    retry: false,
  });

  const mcpByTool = useQuery({
    refetchInterval: 15_000,
    queryKey: ["activity", "mcp-by-tool", agentId],
    queryFn: () => mcpByToolRpc({ agentId }),
    retry: false,
  });

  const usageSummary = useQuery({
    refetchInterval: 15_000,
    queryKey: ["activity", "summary", agentId],
    queryFn: () => summaryRpc({ agentId }),
    retry: false,
  });

  const skillFile = useQuery({
    queryKey: ["activity", "read-skill", skillDetail?.path ?? ""],
    queryFn: () => readSkillRpc({ path: skillDetail!.path }),
    enabled: Boolean(skillDetail?.path),
    retry: false,
  });

  const skillItems = useMemo(() => {
    return (skillsByName.data?.items ?? [])
      .filter((item) => item.total > 0)
      .slice()
      .sort((a, b) => {
        const ta = a.lastUsedAt ?? "";
        const tb = b.lastUsedAt ?? "";
        return tb.localeCompare(ta) || a.skillName.localeCompare(b.skillName);
      });
  }, [skillsByName.data]);

  const mcpItems = useMemo(() => {
    return (mcpByTool.data?.items ?? []).slice().sort((a, b) => {
      const ta = a.lastUsedAt ?? "";
      const tb = b.lastUsedAt ?? "";
      return (
        tb.localeCompare(ta) ||
        a.server.localeCompare(b.server) ||
        a.tool.localeCompare(b.tool)
      );
    });
  }, [mcpByTool.data]);

  const tabs = useMemo(() => {
    const next: Array<{ id: TabId; label: string }> = [];
    if (skillItems.length > 0) next.push({ id: "skills", label: "Skills" });
    if (mcpItems.length > 0) next.push({ id: "mcp", label: "MCP" });
    return next;
  }, [skillItems.length, mcpItems.length]);

  useEffect(() => {
    if (tabs.length === 0) {
      setTab(null);
      return;
    }
    if (!tab || !tabs.some((item) => item.id === tab)) {
      setTab(tabs[0]!.id);
    }
  }, [tabs, tab]);

  const styles = useMemo(
    () => ({
      screen: { flex: 1, backgroundColor: theme.colors.surface0 },
      content: {
        padding,
        paddingBottom: padding + 24,
        gap: layout.compact ? 20 : 28,
        maxWidth: 1000,
        width: "100%" as const,
        alignSelf: "center" as const,
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
        alignSelf: "flex-start" as const,
        gap: 20,
      },
      rangeSegment: {
        paddingVertical: 8,
      },
      rangeSegmentActive: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.foreground,
      },
      chipText: {
        color: theme.colors.foregroundMuted,
        fontSize: 13,
        fontWeight: "500" as const,
      },
      chipTextActive: {
        color: theme.colors.foreground,
        fontSize: 13,
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
        paddingHorizontal: 0,
        paddingVertical: 12,
        borderTopWidth: 0,
        borderTopColor: theme.colors.border,
      },
      listRowFirst: {
        borderTopWidth: 0,
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
      conversationLink: {
        color: theme.colors.accent,
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
      backRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 4,
        alignSelf: "flex-start" as const,
      },
      back: {
        color: theme.colors.foregroundMuted,
        fontSize: 13,
        fontWeight: "500" as const,
      },
      body: {
        color: theme.colors.foreground,
        fontSize: 13,
        fontFamily: MONO,
        lineHeight: 22,
        backgroundColor: theme.colors.surface1,
        padding: 16,
        borderRadius: 12,
      },
    }),
    [theme, layout.compact, padding],
  );

  const loading = skillsByName.isLoading || mcpByTool.isLoading;
  const error = skillsByName.error ?? mcpByTool.error;

  if (skillDetail) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            clearPendingSkillOpen(agentId);
            setSkillDetail(null);
          }}
          style={styles.backRow}
        >
          <Icon name="ChevronLeft" size={16} color={theme.colors.foregroundMuted} />
          <Text style={styles.back}>Skills</Text>
        </Pressable>
        <Text style={styles.sectionTitle}>{formatDisplayName(skillDetail.skillName)}</Text>
        {skillFile.isLoading ? <ActivityIndicator color={theme.colors.accent} /> : null}
        {skillFile.error ? (
          <Text style={{ color: theme.colors.statusDanger }}>
            {skillFile.error instanceof Error ? skillFile.error.message : String(skillFile.error)}
          </Text>
        ) : null}
        {skillFile.data ? (
          <Text style={styles.body} selectable>
            {skillFile.data.body}
          </Text>
        ) : null}
      </ScrollView>
    );
  }

  const compact = layout.compact;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={{ gap: 6 }}>
        {!compact ? <Text style={styles.sectionTitle}>Activity</Text> : null}
        {openAgent ? (
          <Text
            accessibilityRole="link"
            accessibilityLabel={`Open conversation ${conversationLabel}`}
            style={styles.conversationLink}
            onPress={() => openAgent({ agentId })}
          >
            {conversationLabel}
          </Text>
        ) : (
          <Text style={styles.listMeta}>{conversationLabel}</Text>
        )}
      </View>
      {!loading && !error ? <UsageStats compact={layout.compact} colors={theme.colors} items={[
        { label: "Skill calls", value: skillItems.reduce((sum, item) => sum + item.total, 0).toLocaleString() },
        { label: "MCP calls", value: mcpItems.reduce((sum, item) => sum + item.count, 0).toLocaleString() },
        { label: "Shell calls", value: (usageSummary.data?.shellCalls ?? 0).toLocaleString() },
        { label: "File reads", value: (usageSummary.data?.fileReads ?? 0).toLocaleString() },
        { label: "File writes", value: (usageSummary.data?.fileWrites ?? 0).toLocaleString() },
        { label: "Messages", value: (usageSummary.data?.messageCount ?? 0).toLocaleString() },
        { label: "Tools explored", value: String(skillItems.length + mcpItems.length) },
      ]} /> : null}
      {tabs.length > 1 ? (
        <View style={styles.rangeBar}>
          {tabs.map((item) => {
            const active = tab === item.id;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setTab(item.id)}
                style={[styles.rangeSegment, active ? styles.rangeSegmentActive : null]}
              >
                <Text style={active ? styles.chipTextActive : styles.chipText}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {loading ? <ActivityIndicator color={theme.colors.accent} /> : null}
      {error ? (
        <Text style={{ color: theme.colors.statusDanger }}>
          {error instanceof Error ? error.message : String(error)}
        </Text>
      ) : null}

      {!loading && !error && tabs.length === 0 ? (
        <View style={{ gap: 12 }}>
          {!compact ? <Text style={styles.sectionTitle}>Activity</Text> : null}
          <Text style={styles.empty}>No skill or MCP calls yet</Text>
        </View>
      ) : null}

      {tab === "skills" ? (
        <View style={{ gap: 12 }}>
          <Text style={styles.sectionTitle}>Skills</Text>
          <View style={styles.panel}>
            {skillItems.map((item, index) => {
              const name = formatDisplayName(item.skillName);
              const title = item.skillPath ? (
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={`Open ${name} SKILL.md`}
                  onPress={() =>
                    setSkillDetail({ skillName: item.skillName, path: item.skillPath! })
                  }
                >
                  <Text style={styles.listLink} numberOfLines={1}>
                    {name}
                  </Text>
                </Pressable>
              ) : (
                <Text style={styles.listTitle} numberOfLines={1}>
                  {name}
                </Text>
              );
              return (
                <View
                  key={item.skillName}
                  style={[styles.listRow, index === 0 ? styles.listRowFirst : null]}
                >
                  <Icon name="Sparkles" size={18} color={theme.colors.foregroundMuted} />
                  <View style={styles.listMain}>
                    {title}
                    <Text style={styles.listMeta}>
                      Last {formatLocalDateTime(item.lastUsedAt)}
                    </Text>
                  </View>
                  <CountText value={item.total} styles={styles} />
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {tab === "mcp" ? (
        <View style={{ gap: 12 }}>
          <Text style={styles.sectionTitle}>MCP</Text>
          <View style={styles.panel}>
            {mcpItems.map((item, index) => (
              <View
                key={`${item.server}.${item.tool}`}
                style={[styles.listRow, index === 0 ? styles.listRowFirst : null]}
              >
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
