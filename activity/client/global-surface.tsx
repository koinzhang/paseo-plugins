import { type PluginSurfaceProps, useRpc } from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import {
  providerLabel,
  usageActivityByDayRpc,
  usageByProviderRpc,
  type ProviderUsageItem,
} from "../shared/usage.ts";
import { formatDisplayName } from "../shared/format.ts";
import {
  ActivityHeatmap,
  computeStreaks,
  type HeatmapMode,
} from "./activity-heatmap.tsx";

import { UsageStats } from "./usage-stats.tsx";
import { mcpServerColor } from "./rank-color.ts";
import { selectProviderOptions } from "./provider-filter.ts";
import { useAppLanguage } from "./use-app-language.ts";
import { buildActivityInsights, ACTIVITY_LIST_LIMIT } from "../shared/insights.ts";
import { rangeFrom, RANGE_OPTIONS, type RangeId } from "./range.ts";
import { useRegisterOpenAgent } from "./open-agent.ts";

/** Max rows for Activity insights and Most used skills / MCP. */
const LIST_LIMIT = ACTIVITY_LIST_LIMIT;

/** Zeroed provider row when the chip exists all-time but the time window has no rows. */
function emptyProviderUsage(provider: string, label?: string): ProviderUsageItem {
  return {
    provider,
    label: label ?? providerLabel(provider),
    shellCalls: 0,
    shellFailures: 0,
    fileReads: 0,
    fileWrites: 0,
    skillCalls: { exact: 0, inferred: 0, low: 0 },
    skills: [],
    mcpCalls: 0,
    mcpFailures: 0,
    mcpTools: [],
    shellTop: [],
    models: [],
    agentCount: 0,
    codingAgentCount: 0,
    chatAgentCount: 0,
    workspaceCount: 0,
    messageCount: 0,
    callCount: 0,
  };
}



function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 10_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(value);
}

function TextTabs({
  options,
  value,
  onChange,
  styles,
}: {
  options: ReadonlyArray<{ id: string; label: string }>;
  value: string;
  onChange: (id: string) => void;
  styles: { tabRow: ViewStyle; tab: TextStyle; tabActive: TextStyle };
}): ReactNode {
  return (
    <View style={styles.tabRow}>
      {options.map((option) => {
        const active = option.id === value;
        return (
          <Pressable key={option.id} accessibilityRole="tab" accessibilityState={{ selected: active }} style={{ paddingVertical: 6 }} onPress={() => onChange(option.id)}>
            <Text style={active ? styles.tabActive : styles.tab}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type RankKind = "skills" | "mcp" | "models";

type RankItem = {
  key: string;
  label: string;
  count: number;
  kind: RankKind;
  server?: string;
  countLabel?: string;
};

const RANK_CYCLE: RankKind[] = ["skills", "mcp", "models"];

function nextRankKind(kind: RankKind): RankKind {
  return RANK_CYCLE[(RANK_CYCLE.indexOf(kind) + 1) % RANK_CYCLE.length] ?? "skills";
}

function rankTitle(kind: RankKind): string {
  if (kind === "skills") return "Most used skills";
  if (kind === "mcp") return "Most used MCP";
  return "Most used models";
}

function rankEmpty(kind: RankKind): string {
  if (kind === "skills") return "No skills yet";
  if (kind === "mcp") return "No MCP yet";
  return "No models yet";
}

function rankHeaderAction(kind: RankKind): {
  icon: "Sparkles" | "Plug" | "Bot";
  accessibilityLabel: string;
} {
  if (kind === "skills") {
    return { icon: "Plug", accessibilityLabel: "Show most used MCP" };
  }
  if (kind === "mcp") {
    return { icon: "Bot", accessibilityLabel: "Show most used models" };
  }
  return { icon: "Sparkles", accessibilityLabel: "Show most used skills" };
}

function rankIconName(kind: RankKind): "Sparkles" | "Plug" | "Bot" {
  if (kind === "skills") return "Sparkles";
  if (kind === "mcp") return "Plug";
  return "Bot";
}

function RankList({
  title,
  items,
  empty,
  styles,
  colors,
  headerAction,
}: {
  title: string;
  items: RankItem[];
  empty: string;
  styles: {
    block: ViewStyle;
    blockTitle: TextStyle;
    titleRow: ViewStyle;
    titleAction: ViewStyle;
    rankRow: ViewStyle;
    rankName: TextStyle;
    rankMeta: TextStyle;
    emptyHint: TextStyle;
  };
  colors: { accent: string; foregroundMuted: string };
  headerAction?: {
    icon: "Sparkles" | "Plug" | "Bot";
    accessibilityLabel: string;
    onPress: () => void;
  };
}): ReactNode {
  return (
    <View style={styles.block}>
      <View style={styles.titleRow}>
        <Text style={styles.blockTitle}>{title}</Text>
        {headerAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={headerAction.accessibilityLabel}
            hitSlop={8}
            onPress={headerAction.onPress}
            style={styles.titleAction}
          >
            <Icon name={headerAction.icon} size={16} color={colors.foregroundMuted} />
          </Pressable>
        ) : null}
      </View>
      {items.length === 0 ? (
        <Text style={styles.emptyHint}>{empty}</Text>
      ) : (
        items.map((item) => (
          <View key={item.key} style={styles.rankRow}>
            <Icon
              name={rankIconName(item.kind)}
              size={14}
              color={
                item.kind === "mcp"
                  ? mcpServerColor(item.server ?? "", colors.accent)
                  : colors.accent
              }
            />
            <Text style={styles.rankName} numberOfLines={1}>
              {item.label}
            </Text>
            <Text style={styles.rankMeta}>
              {item.count} {item.countLabel ?? "calls"}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

export function GlobalUsageSurface({ theme, layout, navigation }: PluginSurfaceProps) {
  useRegisterOpenAgent(navigation?.openAgent);
  const [range, setRange] = useState<RangeId>("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>("daily");
  const [rankKind, setRankKind] = useState<RankKind>("skills");
  const locale = useAppLanguage();
  // Recompute on each render so today / rolling windows refresh after midnight (poll-driven).
  const from = rangeFrom(range);

  const padding = layout.compact ? 16 : 20;
  const byProvider = useRpc(usageByProviderRpc);
  const activityByDay = useRpc(usageActivityByDayRpc);

  const filter = from ? { from } : {};

  /** All-time providers for filter chips (agents / skills / messages / …). */
  const catalogQuery = useQuery({
    refetchInterval: 15_000,
    retry: false,
    queryKey: ["activity", "by-provider", "all"],
    queryFn: () => byProvider({}),
  });

  const query = useQuery({
    refetchInterval: 15_000,
    retry: false,
    // Shares cache with catalogQuery when range === "all".
    queryKey: ["activity", "by-provider", from ?? "all"],
    queryFn: () => byProvider(filter),
    // Keep prior window while range chips change so KPI/lists do not collapse.
    placeholderData: keepPreviousData,
  });

  const activityQuery = useQuery({
    refetchInterval: 15_000,
    retry: false,
    queryKey: ["activity", "activity-by-day", range, from ?? "all", providerFilter],
    queryFn: () =>
      activityByDay({
        ...filter,
        provider: providerFilter === "all" ? undefined : providerFilter,
      }),
    // Keep prior heatmap while provider / range switches — avoids spinner pushing layout.
    placeholderData: keepPreviousData,
  });

  const providers = query.data?.providers ?? [];
  const catalogProviders = catalogQuery.data?.providers ?? providers;

  const providerOptions = useMemo(
    () => [
      { id: "all", label: "All" },
      ...selectProviderOptions(catalogProviders, providerFilter),
    ],
    [catalogProviders, providerFilter],
  );

  useEffect(() => {
    if (providerFilter === "all") return;
    if (!catalogProviders.some((item) => item.provider === providerFilter)) {
      setProviderFilter("all");
    }
  }, [catalogProviders, providerFilter]);

  const filteredProviders = useMemo(() => {
    if (providerFilter === "all") return providers;
    const inWindow = providers.filter((item) => item.provider === providerFilter);
    if (inWindow.length > 0) return inWindow;
    const catalog = catalogProviders.find((item) => item.provider === providerFilter);
    if (!catalog) return [];
    return [emptyProviderUsage(catalog.provider, catalog.label)];
  }, [catalogProviders, providerFilter, providers]);

  const lists = useMemo(() => {
    if (providerFilter === "all") {
      const mcpMap = new Map<
        string,
        { server: string; tool: string; count: number; failures: number }
      >();
      const skillMap = new Map<string, number>();
      const modelMap = new Map<string, number>();

      for (const item of providers) {
        for (const mcp of item.mcpTools) {
          const key = `${mcp.server}.${mcp.tool}`;
          const prev = mcpMap.get(key);
          if (prev) {
            prev.count += mcp.count;
            prev.failures += mcp.failures;
          } else {
            mcpMap.set(key, {
              server: mcp.server,
              tool: mcp.tool,
              count: mcp.count,
              failures: mcp.failures,
            });
          }
        }
        for (const skill of item.skills) {
          if (skill.total <= 0) continue;
          skillMap.set(skill.skillName, (skillMap.get(skill.skillName) ?? 0) + skill.total);
        }
        for (const model of item.models) {
          if (model.count <= 0) continue;
          modelMap.set(model.model, (modelMap.get(model.model) ?? 0) + model.count);
        }
      }

      const skills: RankItem[] = [...skillMap.entries()]
        .map(([skillName, count]) => ({
          key: skillName,
          label: formatDisplayName(skillName),
          count,
          kind: "skills" as const,
        }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

      const mcp: RankItem[] = [...mcpMap.entries()]
        .map(([key, item]) => ({
          key,
          label: formatDisplayName(`${item.server}.${item.tool}`),
          count: item.count,
          kind: "mcp" as const,
          server: item.server,
        }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

      const models: RankItem[] = [...modelMap.entries()]
        .map(([model, count]) => ({
          key: model,
          label: formatDisplayName(model),
          count,
          kind: "models" as const,
          countLabel: "messages",
        }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

      return { skills, mcp, models };
    }

    const selected = filteredProviders[0];
    if (!selected) return { skills: [], mcp: [], models: [] };

    const skills: RankItem[] = selected.skills
      .filter((skill) => skill.total > 0)
      .map((skill) => ({
        key: skill.skillName,
        label: formatDisplayName(skill.skillName),
        count: skill.total,
        kind: "skills" as const,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    const mcp: RankItem[] = selected.mcpTools
      .map((item) => ({
        key: `${item.server}.${item.tool}`,
        label: formatDisplayName(`${item.server}.${item.tool}`),
        count: item.count,
        kind: "mcp" as const,
        server: item.server,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    const models: RankItem[] = selected.models
      .filter((item) => item.count > 0)
      .map((item) => ({
        key: item.model,
        label: formatDisplayName(item.model),
        count: item.count,
        kind: "models" as const,
        countLabel: "messages",
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    return { skills, mcp, models };
  }, [filteredProviders, providerFilter, providers]);

  const summary = useMemo(() => {
    let skills = 0;
    let mcp = 0;
    let shell = 0;
    let fileReads = 0;
    let fileWrites = 0;
    let agents = 0;
    let codingAgents = 0;
    let chatAgents = 0;
    let messages = 0;
    for (const item of filteredProviders) {
      skills += item.skillCalls.exact + item.skillCalls.inferred;
      mcp += item.mcpCalls;
      shell += item.shellCalls;
      fileReads += item.fileReads;
      fileWrites += item.fileWrites;
      agents += item.agentCount;
      codingAgents += item.codingAgentCount;
      chatAgents += item.chatAgentCount;
      messages += item.messageCount;
    }
    const workspaces =
      providerFilter === "all"
        ? (query.data?.totals.workspaceCount ?? 0)
        : (filteredProviders[0]?.workspaceCount ?? 0);
    return {
      skills,
      mcp,
      shell,
      fileReads,
      fileWrites,
      agents,
      codingAgents,
      chatAgents,
      messages,
      workspaces,
    };
  }, [filteredProviders, providerFilter, query.data?.totals.workspaceCount]);

  const streaks = useMemo(
    () => computeStreaks(activityQuery.data?.days ?? []),
    [activityQuery.data],
  );

  const insights = useMemo(() => {
    return buildActivityInsights({
      days: activityQuery.data?.days ?? [],
      summary: {
        skills: summary.skills,
        mcp: summary.mcp,
        agents: summary.agents,
        messages: summary.messages,
        codingAgents: summary.codingAgents,
        chatAgents: summary.chatAgents,
        longestStreak: streaks.longest,
      },
      providers: filteredProviders,
      providerFilter,
      locale,
      limit: LIST_LIMIT,
    });
  }, [activityQuery.data?.days, filteredProviders, locale, providerFilter, streaks.longest, summary]);

  const kpi = useMemo(
    () => [
      { value: formatCount(summary.messages), label: "Messages" },
      { value: formatCount(summary.agents), label: "Agents" },
      { value: formatCount(summary.workspaces), label: "Workspaces" },
      { value: formatCount(summary.skills), label: "Skill calls" },
      { value: formatCount(summary.mcp), label: "MCP calls" },
      {
        value: `${streaks.current} day${streaks.current === 1 ? "" : "s"}`,
        label: "Current streak",
      },
    ],
    [summary, streaks],
  );

  const styles = useMemo(
    () => ({
      screen: { flex: 1, backgroundColor: theme.colors.surface0 },
      content: {
        padding,
        paddingBottom: padding + 32,
        gap: layout.compact ? 24 : 32,
        maxWidth: 780,
        width: "100%" as const,
        alignSelf: "center" as const,
      },
      filterRow: {
        flexDirection: "row" as const,
        flexWrap: "wrap" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        gap: layout.compact ? 12 : 16,
      },
      tabRow: {
        flexDirection: "row" as const,
        flexWrap: "wrap" as const,
        alignItems: "center" as const,
        gap: layout.compact ? 12 : 16,
      },
      tab: {
        color: theme.colors.foregroundMuted,
        fontSize: 14,
        fontWeight: "500" as const,
      },
      tabActive: {
        color: theme.colors.foreground,
        fontSize: 14,
        fontWeight: "600" as const,
      },
      columns: {
        flexDirection: layout.compact ? ("column" as const) : ("row" as const),
        alignItems: "flex-start" as const,
        gap: layout.compact ? 24 : 28,
      },
      column: {
        flex: 1,
        minWidth: 0,
        width: layout.compact ? ("100%" as const) : undefined,
      },
      block: {
        gap: 2,
      },
      titleRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        gap: 8,
        marginBottom: 10,
      },
      blockTitle: {
        color: theme.colors.foreground,
        fontSize: layout.compact ? 13 : 15,
        fontWeight: "500" as const,
        flexShrink: 1,
        marginBottom: 0,
      },
      titleAction: {
        padding: 4,
        borderRadius: 6,
      },
      insightRow: {
        flexDirection: "row" as const,
        alignItems: "baseline" as const,
        justifyContent: "space-between" as const,
        gap: 8,
        paddingVertical: 9,
      },
      insightLabel: {
        color: theme.colors.foregroundMuted,
        fontSize: 14,
        flexShrink: 0,
      },
      insightValue: {
        color: theme.colors.foreground,
        fontSize: 14,
        textAlign: "right" as const,
        flex: 1,
        minWidth: 0,
      },
      rankRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 10,
        paddingVertical: 9,
      },
      rankName: {
        color: theme.colors.foreground,
        fontSize: 14,
        flex: 1,
        minWidth: 0,

      },
      rankMeta: {
        color: theme.colors.foregroundMuted,
        fontSize: 14,
        fontVariant: ["tabular-nums" as const],
      },
      emptyState: {
        paddingVertical: 48,
        alignItems: "center" as const,
        gap: 6,
      },
      emptyTitle: {
        color: theme.colors.foreground,
        fontSize: 19,
        fontWeight: "500" as const,
      },
      emptyHint: {
        color: theme.colors.foregroundMuted,
        fontSize: 14,
      },
    }),
    [theme, layout.compact, padding],
  );

  // Keep prior results visible while refetching; spinner only on cold start.
  const loading =
    (!query.data && query.isLoading) ||
    (!activityQuery.data && activityQuery.isLoading);
  const error = query.error ?? activityQuery.error;
  const showContent = filteredProviders.length > 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.filterRow}>
        <TextTabs
          options={RANGE_OPTIONS}
          value={range}
          onChange={(id) => setRange(id as RangeId)}
          styles={styles}
        />
        {providerOptions.length > 1 ? (
          <TextTabs
            options={providerOptions}
            value={providerFilter}
            onChange={setProviderFilter}
            styles={styles}
          />
        ) : null}
      </View>

      {loading ? <ActivityIndicator color={theme.colors.accent} /> : null}
      {error ? (
        <Text style={{ color: theme.colors.statusDanger }}>
          {error instanceof Error ? error.message : String(error)}
        </Text>
      ) : null}

      {filteredProviders.length === 0 && !loading && !error ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No usage yet</Text>
          <Text style={styles.emptyHint}>Agents, messages, skill and MCP calls will show up here</Text>
        </View>
      ) : null}

      {showContent ? (
        <UsageStats items={kpi} colors={theme.colors} compact={layout.compact} />
      ) : null}

      {showContent ? (
        <ActivityHeatmap
          days={activityQuery.data?.days ?? []}
          from={from}
          colors={theme.colors}
          compact={layout.compact}
          mode={heatmapMode}
          onModeChange={setHeatmapMode}
          modeOptions={[
            { id: "daily", label: "Daily" },
            { id: "weekly", label: "Weekly" },
            { id: "cumulative", label: "Cumulative" },
          ]}
        />
      ) : null}

      {showContent ? (
        <View style={styles.columns}>
          <View style={styles.column}>
            <View style={styles.block}>
              <Text style={[styles.blockTitle, { marginBottom: 10 }]}>Activity insights</Text>
              {insights.map((row) => (
                <View key={row.label} style={styles.insightRow}>
                  <Text style={styles.insightLabel}>{row.label}</Text>
                  <Text style={styles.insightValue} numberOfLines={1}>
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.column}>
            <RankList
              title={rankTitle(rankKind)}
              items={(
                rankKind === "skills"
                  ? lists.skills
                  : rankKind === "mcp"
                    ? lists.mcp
                    : lists.models
              ).slice(0, LIST_LIMIT)}
              empty={rankEmpty(rankKind)}
              styles={styles}
              colors={theme.colors}
              headerAction={{
                ...rankHeaderAction(rankKind),
                onPress: () => setRankKind((prev) => nextRankKind(prev)),
              }}
            />
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}
