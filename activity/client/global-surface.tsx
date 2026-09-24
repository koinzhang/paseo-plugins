import { type PluginSurfaceProps, useRpc } from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ScrollView,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import {
  usageActivityByHourRpc,
  providerLabel,
  usageActivityByDayRpc,
  usageAgentCreationsRpc,
  usageAgentLifetimeRpc,
  usageByProjectRpc,
  usageByProviderRpc,
  OTHER_PROJECT_KEY,
  type ProviderUsageItem,
} from "../shared/usage.ts";
import { formatDisplayName } from "../shared/format.ts";
import { ActivityHeatmap } from "./activity-heatmap.tsx";
import { AgentCreations } from "./agent-creations.tsx";
import { HourlyActivityTimeline } from "./hourly-activity-timeline.tsx";
import { ProviderDropdown } from "./provider-dropdown.tsx";
import { RankingBars, type RankingEntry } from "./ranking-bars.tsx";
import { UsageStats } from "./usage-stats.tsx";
import { chartColorScheme, entityColor, providerColor } from "./rank-color.ts";
import { selectProviderOptions } from "./provider-filter.ts";
import { useAppLanguage } from "./use-app-language.ts";
import { buildActivityInsights, buildActivityKpi, ACTIVITY_LIST_LIMIT } from "../shared/insights.ts";
import { fixedWindowFrom } from "./range.ts";
import { useRegisterOpenAgent } from "./open-agent.ts";
import { ICON_SIZE, ROW_PADDING, TEXT, pageLayout, titleGap } from "./design-tokens.ts";
import { messagesFor, type Messages } from "../shared/i18n.ts";
import {
  ErrorState,
  IconButton,
  InlineEmpty,
  LoadingState,
  PageEmpty,
  SectionHeader,
} from "./ui.tsx";

/** Max rows for Activity insights and Most used skills / MCP. */
const LIST_LIMIT = ACTIVITY_LIST_LIMIT;

/** Fixed width of the creations histogram (050). */
const CREATIONS_WINDOW_DAYS = 30;
const HOURLY_WINDOW_HOURS = 7 * 24;

/** Zeroed provider row when a selected provider has no usage row. */
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



type RankKind = "skills" | "mcp" | "models";

type RankItem = {
  key: string;
  label: string;
  count: number;
  kind: RankKind;
  server?: string;
  unit?: "prompts";
};

const RANK_CYCLE: RankKind[] = ["skills", "mcp", "models"];

function nextRankKind(kind: RankKind): RankKind {
  return RANK_CYCLE[(RANK_CYCLE.indexOf(kind) + 1) % RANK_CYCLE.length] ?? "skills";
}

function rankShowIcon(kind: RankKind): "Sparkles" | "Plug" | "Bot" {
  if (kind === "skills") return "Plug";
  if (kind === "mcp") return "Bot";
  return "Sparkles";
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
  compact,
  units,
  headerAction,
}: {
  title: string;
  items: RankItem[];
  empty: string;
  styles: {
    rankRow: ViewStyle;
    rankName: TextStyle;
    rankMeta: TextStyle;
  };
  colors: { accent: string; foreground: string; foregroundMuted: string; surface0: string };
  compact: boolean;
  units: Messages["units"];
  headerAction?: {
    icon: "Sparkles" | "Plug" | "Bot";
    accessibilityLabel: string;
    onPress: () => void;
  };
}): ReactNode {
  return (
    <View style={{ gap: 2 }}>
      <View style={{ marginBottom: titleGap(compact) - 2 }}>
        <SectionHeader title={title} colors={colors} compact={compact}>
          {headerAction ? (
            <IconButton
              icon={headerAction.icon}
              label={headerAction.accessibilityLabel}
              onPress={headerAction.onPress}
              color={colors.foregroundMuted}
            />
          ) : null}
        </SectionHeader>
      </View>
      {items.length === 0 ? (
        <InlineEmpty text={empty} color={colors.foregroundMuted} />
      ) : (
        items.map((item) => (
          <View key={item.key} style={styles.rankRow}>
            <Icon
              name={rankIconName(item.kind)}
              size={ICON_SIZE.inline}
              color={
                item.kind === "mcp"
                  ? entityColor(item.server ?? "", chartColorScheme(colors.surface0))
                  : colors.accent
              }
            />
            <Text style={styles.rankName} numberOfLines={1}>
              {item.label}
            </Text>
            <Text style={styles.rankMeta}>
              {item.unit === "prompts" ? units.prompts(item.count) : units.calls(item.count)}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

export function GlobalUsageSurface({ theme, layout, navigation }: PluginSurfaceProps) {
  useRegisterOpenAgent(navigation?.openAgent);
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [rankKind, setRankKind] = useState<RankKind>("skills");
  const locale = useAppLanguage();
  const m = messagesFor(locale);

  const page = pageLayout("surface", layout.compact);
  const byProvider = useRpc(usageByProviderRpc);
  const byProject = useRpc(usageByProjectRpc);
  const activityByDay = useRpc(usageActivityByDayRpc);
  const activityByHour = useRpc(usageActivityByHourRpc);
  const agentLifetime = useRpc(usageAgentLifetimeRpc);
  const agentCreations = useRpc(usageAgentCreationsRpc);

  // The page is all-time (069): one by-provider query feeds the dropdown, KPI,
  // lists and the provider ranking.
  const query = useQuery({
    refetchInterval: 15_000,
    retry: false,
    queryKey: ["activity", "by-provider", "all"],
    queryFn: () => byProvider({}),
  });

  const currentWindowStart = fixedWindowFrom(7);
  const previousWindowStart = fixedWindowFrom(14);
  // The RPC's `to` is inclusive; end the previous window just before this one.
  const previousWindowEnd = new Date(Date.parse(currentWindowStart) - 1).toISOString();
  const comparisonQuery = useQuery({
    refetchInterval: 15_000,
    retry: false,
    queryKey: ["activity", "kpi-comparison", currentWindowStart],
    queryFn: async () => {
      const [current, previous] = await Promise.all([
        byProvider({ from: currentWindowStart }),
        byProvider({ from: previousWindowStart, to: previousWindowEnd }),
      ]);
      return { current: current.providers, previous: previous.providers };
    },
  });

  const activityQuery = useQuery({
    refetchInterval: 15_000,
    retry: false,
    queryKey: ["activity", "activity-by-day", "all", providerFilter],
    queryFn: () =>
      activityByDay({
        provider: providerFilter === "all" ? undefined : providerFilter,
      }),
    // Keep prior heatmap while the provider switches — avoids spinner pushing layout.
    placeholderData: keepPreviousData,
  });

  const lifetimeQuery = useQuery({
    refetchInterval: 15_000,
    retry: false,
    // Lifetime is all-time by design (049): only the provider filter applies.
    queryKey: ["activity", "agent-lifetime", providerFilter],
    queryFn: () =>
      agentLifetime({ provider: providerFilter === "all" ? undefined : providerFilter }),
    placeholderData: keepPreviousData,
  });

  const histogramQuery = useQuery({
    refetchInterval: 15_000,
    retry: false,
    // Fixed 30-day window (050).
    queryKey: ["activity", "agent-creations", "last30", providerFilter],
    queryFn: () =>
      agentCreations({
        from: fixedWindowFrom(CREATIONS_WINDOW_DAYS),
        provider: providerFilter === "all" ? undefined : providerFilter,
      }),
    placeholderData: keepPreviousData,
  });

  const projectQuery = useQuery({
    refetchInterval: 15_000,
    retry: false,
    queryKey: ["activity", "by-project", providerFilter],
    queryFn: () =>
      byProject({ provider: providerFilter === "all" ? undefined : providerFilter }),
    placeholderData: keepPreviousData,
  });

  const hourlyQuery = useQuery({
    refetchInterval: 15_000,
    retry: false,
    // Fixed 168-hour window (059).
    queryKey: ["activity", "activity-by-hour", "last168", providerFilter],
    queryFn: () =>
      activityByHour({
        hours: HOURLY_WINDOW_HOURS,
        provider: providerFilter === "all" ? undefined : providerFilter,
      }),
    placeholderData: keepPreviousData,
  });

  const providers = useMemo(() => query.data?.providers ?? [], [query.data]);

  const providerOptions = useMemo(
    () => [
      { id: "all", label: m.global.allProviders },
      ...selectProviderOptions(providers, providerFilter),
    ],
    [providers, providerFilter, m],
  );

  useEffect(() => {
    if (providerFilter === "all" || !query.data) return;
    if (!providers.some((item) => item.provider === providerFilter)) {
      setProviderFilter("all");
    }
  }, [providers, providerFilter, query.data]);

  const filteredProviders = useMemo(() => {
    if (providerFilter === "all") return providers;
    const selected = providers.find((item) => item.provider === providerFilter);
    return selected ? [selected] : [emptyProviderUsage(providerFilter)];
  }, [providerFilter, providers]);

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
          unit: "prompts" as const,
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
        unit: "prompts" as const,
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
      },
      workspaces: summary.workspaces,
      averageSessionMs: lifetimeQuery.data?.averageEngagedMs,
      multiTurn: lifetimeQuery.data,
      locale,
    });
  }, [activityQuery.data?.days, lifetimeQuery.data, locale, summary]);

  const kpi = useMemo(
    () =>
      buildActivityKpi({
        sessions: summary.agents,
        messages: summary.messages,
        locale,
        providers: filteredProviders,
        allProviders: providers,
        providerFilter,
        comparison: comparisonQuery.data,
      }),
    [
      comparisonQuery.data,
      filteredProviders,
      locale,
      providerFilter,
      providers,
      summary.agents,
      summary.messages,
    ],
  );

  const scheme = chartColorScheme(theme.colors.surface0);
  const providerEntries = useMemo<RankingEntry[]>(
    () =>
      providers.map((item) => ({
        key: item.provider,
        label: item.label,
        color: providerColor(item.provider, scheme),
        agents: item.agentCount,
        messages: item.messageCount,
        skills: item.skillCalls.exact + item.skillCalls.inferred,
        mcp: item.mcpCalls,
      })),
    [providers, scheme],
  );
  const projectEntries = useMemo<RankingEntry[]>(
    () =>
      (projectQuery.data?.projects ?? []).map((item) => ({
        key: item.key,
        label: item.key === OTHER_PROJECT_KEY ? m.global.projectRanking.other : item.label,
        color:
          item.key === OTHER_PROJECT_KEY ? theme.colors.foregroundMuted : entityColor(item.key, scheme),
        agents: item.agentCount,
        messages: item.messageCount,
        skills: item.skillCalls,
        mcp: item.mcpCalls,
      })),
    [projectQuery.data, scheme, m, theme.colors.foregroundMuted],
  );

  const styles = useMemo(
    () => ({
      screen: { flex: 1, backgroundColor: theme.colors.surface0 },
      content: {
        padding: page.padding,
        paddingBottom: page.padding + 32,
        gap: page.gap,
        maxWidth: 780,
        width: "100%" as const,
        alignSelf: "center" as const,
      },
      filterRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "flex-end" as const,
        position: "relative" as const,
        zIndex: 20,
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
      insightRow: {
        flexDirection: "row" as const,
        alignItems: "baseline" as const,
        justifyContent: "space-between" as const,
        gap: 8,
        paddingVertical: ROW_PADDING.regular,
      },
      insightLabel: {
        ...TEXT.body,
        color: theme.colors.foregroundMuted,
        flexShrink: 0,
      },
      insightValue: {
        ...TEXT.body,
        color: theme.colors.foreground,
        textAlign: "right" as const,
        flex: 1,
        minWidth: 0,
      },
      rankRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 10,
        paddingVertical: ROW_PADDING.regular,
      },
      rankName: {
        ...TEXT.body,
        color: theme.colors.foreground,
        flex: 1,
        minWidth: 0,
      },
      rankMeta: {
        ...TEXT.body,
        color: theme.colors.foregroundMuted,
        fontVariant: ["tabular-nums" as const],
      },
    }),
    [theme, layout.compact, page.padding, page.gap],
  );

  // Keep prior results visible while refetching; spinner only on cold start.
  const loading =
    (!query.data && query.isLoading) ||
    (!activityQuery.data && activityQuery.isLoading) ||
    (!hourlyQuery.data && hourlyQuery.isLoading);
  const error = query.error ?? activityQuery.error ?? hourlyQuery.error;
  const retry = () => {
    void query.refetch();
    void activityQuery.refetch();
    void hourlyQuery.refetch();
  };
  const showContent = filteredProviders.length > 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {providerOptions.length > 1 ? (
        <View style={styles.filterRow}>
          <ProviderDropdown
            label={m.global.providerLabel}
            options={providerOptions}
            value={providerFilter}
            onChange={setProviderFilter}
            colors={theme.colors}
            triggerLabel={m.global.selectProvider}
            closeLabel={m.global.closeProviderMenu}
          />
        </View>
      ) : null}

      {loading ? <LoadingState color={theme.colors.accent} /> : null}
      {error ? <ErrorState error={error} onRetry={retry} colors={theme.colors} /> : null}

      {filteredProviders.length === 0 && !loading && !error ? (
        <PageEmpty title={m.global.emptyTitle} hint={m.global.emptyHint} colors={theme.colors} />
      ) : null}

      {showContent ? (
        <UsageStats items={kpi} colors={theme.colors} compact={layout.compact} />
      ) : null}

      {showContent ? (
        <ActivityHeatmap
          days={activityQuery.data?.days ?? []}
          colors={theme.colors}
          compact={layout.compact}
          mode="daily"
        />
      ) : null}

      {showContent ? (
        <AgentCreations
          days={histogramQuery.data?.days ?? []}
          activityDays={activityQuery.data?.days ?? []}
          windowDays={CREATIONS_WINDOW_DAYS}
          colors={theme.colors}
          compact={layout.compact}
          locale={locale}
        />
      ) : null}

      {showContent ? (
        <HourlyActivityTimeline
          hours={hourlyQuery.data?.hours ?? []}
          colors={theme.colors}
          compact={layout.compact}
          locale={locale}
          resetKey={providerFilter}
        />
      ) : null}

      {showContent ? (
        <RankingBars
          title={m.global.providerRanking.title}
          empty={m.global.providerRanking.empty}
          entries={providerEntries}
          highlight={providerFilter === "all" ? undefined : providerFilter}
          colors={theme.colors}
          compact={layout.compact}
          locale={locale}
        />
      ) : null}

      {showContent ? (
        <RankingBars
          title={m.global.projectRanking.title}
          empty={m.global.projectRanking.empty}
          entries={projectEntries}
          colors={theme.colors}
          compact={layout.compact}
          locale={locale}
        />
      ) : null}

      {showContent ? (
        <View style={styles.columns}>
          <View style={styles.column}>
            <View style={{ gap: 2 }}>
              <View style={{ marginBottom: titleGap(layout.compact) - 2 }}>
                <SectionHeader title={m.insights.title} colors={theme.colors} compact={layout.compact} />
              </View>
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
              title={m.global.rankTitle[rankKind]}
              items={
                rankKind === "skills"
                  ? lists.skills.slice(0, LIST_LIMIT)
                  : rankKind === "mcp"
                    ? lists.mcp.slice(0, LIST_LIMIT)
                    : lists.models
              }
              empty={m.global.rankEmpty[rankKind]}
              styles={styles}
              colors={theme.colors}
              compact={layout.compact}
              units={m.units}
              headerAction={{
                icon: rankShowIcon(rankKind),
                accessibilityLabel: m.global.rankShow[nextRankKind(rankKind)],
                onPress: () => setRankKind((prev) => nextRankKind(prev)),
              }}
            />
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}
