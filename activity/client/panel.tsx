import { type PluginAgentPanelProps, useAgent, useRpc } from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useRegisterOpenAgent } from "./open-agent.ts";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  usageMcpByToolRpc,
  usageReadSkillRpc,
  usageSkillsByNameRpc,
  usageSummaryRpc,
} from "../shared/usage.ts";
import { formatDisplayName } from "../shared/format.ts";
import { FormattedTime } from "./formatted-time.tsx";
import {
  clearPendingSkillOpen,
  consumePendingSkillOpen,
  subscribePendingSkillOpen,
} from "./pending-skill.ts";
import { useAgentTurnEnd } from "./use-agent-turn-end.ts";

import { UsageStats } from "./usage-stats.tsx";
import { useAppLanguage, useMessages } from "./use-app-language.ts";
import {
  CountText,
  ErrorState,
  IconButton,
  InlineEmpty,
  LoadingState,
  Section,
  SectionHeader,
} from "./ui.tsx";
import {
  ICON_SIZE,
  RADIUS,
  ROW_PADDING,
  TEXT,
  iconButton,
  pageLayout,
  sectionTitle,
} from "./design-tokens.ts";

type TabId = "skills" | "mcp";

type SkillDetail = {
  skillName: string;
  path: string;
};


export function UsagePanel({ theme, layout, agentId, navigation }: PluginAgentPanelProps) {
  const locale = useAppLanguage();
  const m = useMessages();
  const [tab, setTab] = useState<TabId | null>(null);
  const [skillDetail, setSkillDetail] = useState<SkillDetail | null>(null);
  const page = pageLayout("panel", layout.compact);
  const agentTitle = useAgent(agentId, (agent) => agent.title);
  const openAgent = navigation?.openAgent;
  useRegisterOpenAgent(openAgent);
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

  const queryClient = useQueryClient();
  useAgentTurnEnd({ agentId }, () => {
    void queryClient.invalidateQueries({ queryKey: ["activity", "skills-by-name", agentId] });
    void queryClient.invalidateQueries({ queryKey: ["activity", "mcp-by-tool", agentId] });
    void queryClient.invalidateQueries({ queryKey: ["activity", "summary", agentId] });
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
    if (skillItems.length > 0) next.push({ id: "skills", label: m.common.skills });
    if (mcpItems.length > 0) next.push({ id: "mcp", label: m.common.mcp });
    return next;
  }, [skillItems.length, mcpItems.length, m]);

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
        padding: page.padding,
        paddingBottom: page.padding + 24,
        gap: page.gap,
        maxWidth: 1000,
        width: "100%" as const,
        alignSelf: "center" as const,
      },
      sectionTitle: {
        ...sectionTitle(layout.compact),
        color: theme.colors.foreground,
        flexShrink: 1,
      },
      sectionHeaderRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        gap: 8,
      },
      titleAction: iconButton,
      panel: {
        gap: 4,
        overflow: "hidden" as const,
      },
      listRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 12,
        paddingHorizontal: 0,
        paddingVertical: ROW_PADDING.regular,
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
        ...TEXT.rowTitle,
        color: theme.colors.foreground,
      },
      listLink: {
        ...TEXT.rowTitle,
        color: theme.colors.foreground,
      },
      listMeta: {
        ...TEXT.meta,
        color: theme.colors.foregroundMuted,
      },
      conversationLink: {
        ...TEXT.meta,
        color: theme.colors.accent,
      },
      countText: {
        ...TEXT.count,
        color: theme.colors.foregroundMuted,
        minWidth: 24,
        textAlign: "right" as const,
      },
      empty: {
        ...TEXT.small,
        color: theme.colors.foregroundMuted,
      },
      backRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 4,
        alignSelf: "flex-start" as const,
      },
      back: {
        ...TEXT.back,
        color: theme.colors.foregroundMuted,
      },
      body: {
        ...TEXT.code,
        color: theme.colors.foreground,
        backgroundColor: theme.colors.surface1,
        padding: 16,
        borderRadius: RADIUS.block,
      },
    }),
    [theme, layout.compact, page.padding, page.gap],
  );

  const loading = skillsByName.isLoading || mcpByTool.isLoading;
  const error = skillsByName.error ?? mcpByTool.error;
  const showToggle = tabs.length > 1;
  const toggleAction =
    tab === "skills"
      ? { icon: "Plug" as const, accessibilityLabel: m.common.showMcp, next: "mcp" as const }
      : { icon: "Sparkles" as const, accessibilityLabel: m.common.showSkills, next: "skills" as const };

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
          <Icon name="ChevronLeft" size={ICON_SIZE.action} color={theme.colors.foregroundMuted} />
          <Text style={styles.back}>{m.common.skills}</Text>
        </Pressable>
        <Text style={styles.sectionTitle}>{formatDisplayName(skillDetail.skillName)}</Text>
        {skillFile.isLoading ? <LoadingState color={theme.colors.accent} /> : null}
        {skillFile.error ? (
          <ErrorState error={skillFile.error} onRetry={() => void skillFile.refetch()} colors={theme.colors} />
        ) : null}
        {skillFile.data ? (
          <Text style={styles.body} selectable>
            {skillFile.data.body}
          </Text>
        ) : null}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={{ gap: 6 }}>
        {openAgent ? (
          <Text
            accessibilityRole="link"
            accessibilityLabel={m.common.openConversation(conversationLabel)}
            style={styles.conversationLink}
            onPress={() => openAgent({ agentId })}
          >
            {conversationLabel}
          </Text>
        ) : (
          <Text style={styles.listMeta}>{conversationLabel}</Text>
        )}
      </View>
      {!loading && !error ? <UsageStats compact={layout.compact} dense colors={theme.colors} items={[
        { label: m.kpi.skillCalls, value: skillItems.reduce((sum, item) => sum + item.total, 0).toLocaleString(locale) },
        { label: m.kpi.mcpCalls, value: mcpItems.reduce((sum, item) => sum + item.count, 0).toLocaleString(locale) },
        { label: m.kpi.shellCalls, value: (usageSummary.data?.shellCalls ?? 0).toLocaleString(locale) },
        { label: m.kpi.fileReads, value: (usageSummary.data?.fileReads ?? 0).toLocaleString(locale) },
        { label: m.kpi.fileWrites, value: (usageSummary.data?.fileWrites ?? 0).toLocaleString(locale) },
        { label: m.kpi.messages, value: (usageSummary.data?.messageCount ?? 0).toLocaleString(locale) },
        { label: m.kpi.toolsExplored, value: String(skillItems.length + mcpItems.length) },
      ]} /> : null}

      {loading ? <LoadingState color={theme.colors.accent} /> : null}
      {error ? (
        <ErrorState
          error={error}
          onRetry={() => {
            void skillsByName.refetch();
            void mcpByTool.refetch();
          }}
          colors={theme.colors}
        />
      ) : null}

      {!loading && !error && tabs.length === 0 ? (
        <InlineEmpty text={m.common.noSkillOrMcp} color={theme.colors.foregroundMuted} />
      ) : null}

      {tab ? (
        <Section compact={layout.compact}>
          <SectionHeader title={tab === "skills" ? m.common.skills : m.common.mcp} colors={theme.colors} compact={layout.compact}>
            {showToggle ? (
              <IconButton
                icon={toggleAction.icon}
                label={toggleAction.accessibilityLabel}
                onPress={() => setTab(toggleAction.next)}
                color={theme.colors.foregroundMuted}
              />
            ) : null}
          </SectionHeader>
          {tab === "skills" ? (
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
                    <Icon name="Sparkles" size={ICON_SIZE.leading} color={theme.colors.foregroundMuted} />
                    <View style={styles.listMain}>
                      {title}
                      <FormattedTime
                        iso={item.lastUsedAt}
                        format={m.common.lastUsed}
                        style={styles.listMeta}
                      />
                    </View>
                    <CountText value={item.total} color={theme.colors.foregroundMuted} />
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.panel}>
              {mcpItems.map((item, index) => (
                <View
                  key={`${item.server}.${item.tool}`}
                  style={[styles.listRow, index === 0 ? styles.listRowFirst : null]}
                >
                  <Icon name="Plug" size={ICON_SIZE.leading} color={theme.colors.foregroundMuted} />
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
                  <CountText value={item.count} color={theme.colors.foregroundMuted} />
                </View>
              ))}
            </View>
          )}
        </Section>
      ) : null}
    </ScrollView>
  );
}
