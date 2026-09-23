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
  usageByProviderRpc,
  type ProviderUsageItem,
} from "../shared/usage.ts";
import { formatDisplayName } from "../shared/format.ts";
import {
  ActivityHeatmap,
  computeStreaks,
  type HeatmapMode,
} from "./activity-heatmap.tsx";
import { AgentCreations } from "./agent-creations.tsx";
import { HourlyActivityTimeline } from "./hourly-activity-timeline.tsx";

import { UsageStats } from "./usage-stats.tsx";
import { chartColorScheme, entityColor } from "./rank-color.ts";
import { selectProviderOptions } from "./provider-filter.ts";
import { useAppLanguage } from "./use-app-language.ts";
import { buildActivityInsights, buildActivityKpi, ACTIVITY_LIST_LIMIT } from "../shared/insights.ts";
import { fixedWindowFrom, rangeFrom, RANGE_OPTIONS, type RangeId } from "./range.ts";
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
  TextTabs,
} from "./ui.tsx";

/** Max rows for Activity insights and Most used skills / MCP. */
const LIST_LIMIT = ACTIVITY_LIST_LIMIT;

/** Fixed width of the creations histogram, independent of the range chips (050). */
const CREATIONS_WINDOW_DAYS = 30;
const HOURLY_WINDOW_HOURS = 7 * 24;

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



type RankKind = "skills" | "mcp" | "models";

type RankItem = {
  key: string;
  label: string;
  count: number;
  kind: RankKind;
  server?: string;
  unit?: "messages";
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
              {item.unit === "messages" ? units.messages(item.count) : units.calls(item.count)}
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
  const m = messagesFor(locale);
  // Recompute on each render so today / rolling windows refresh after midnight (poll-driven).
  const from = rangeFrom(range);

  const page = pageLayout("surface", layout.compact);
  const byProvider = useRpc(usageByProviderRpc);
  const activityByDay = useRpc(usageActivityByDayRpc);
  const activityByHour = useRpc(usageActivityByHourRpc);
  const agentLifetime = useRpc(usageAgentLifetimeRpc);
  const agentCreations = useRpc(usageAgentCreationsRpc);

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
    // Fixed window (050): the creations histogram ignores the range chips.
    queryKey: ["activity", "agent-creations", "last30", providerFilter],
    queryFn: () =>
      agentCreations({
        from: fixedWindowFrom(CREATIONS_WINDOW_DAYS),
        provider: providerFilter === "all" ? undefined : providerFilter,
      }),
    placeholderData: keepPreviousData,
  });

  const hourlyQuery = useQuery({
    refetchInterval: 15_000,
    retry: false,
    // Independent fixed window (059): range chips do not affect the hourly stream.
    queryKey: ["activity", "activity-by-hour", "last168", providerFilter],
    queryFn: () =>
      activityByHour({
        hours: HOURLY_WINDOW_HOURS,
        provider: providerFilter === "all" ? undefined : providerFilter,
      }),
    placeholderData: keepPreviousData,
  });

  const providers = query.data?.providers ?? [];
  const catalogProviders = catalogQuery.data?.providers ?? providers;

  const providerOptions = useMemo(
    () => [
      { id: "all", label: m.global.allProviders },
      ...selectProviderOptions(catalogProviders, providerFilter),
    ],
    [catalogProviders, providerFilter, m],
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
          unit: "messages" as const,
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
        unit: "messages" as const,
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
      },
      workspaces: summary.workspaces,
      locale,
    });
  }, [activityQuery.data?.days, locale, summary]);

  const kpi = useMemo(
    () =>
      buildActivityKpi({
        agents: summary.agents,
        days: activityQuery.data?.days ?? [],
        locale,
        longestStreak: streaks.longest,
        longestAgent: lifetimeQuery.data?.longest
          ? {
              durationMs: lifetimeQuery.data.longest.durationMs,
              active: lifetimeQuery.data.longest.archivedAt == null,
            }
          : null,
        providers: filteredProviders,
        providerFilter,
      }),
    [
      activityQuery.data?.days,
      filteredProviders,
      lifetimeQuery.data,
      locale,
      providerFilter,
      streaks.longest,
      summary.agents,
    ],
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
        flexWrap: "wrap" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        gap: layout.compact ? 12 : 16,
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
      <View style={styles.filterRow}>
        <TextTabs
          options={RANGE_OPTIONS.map((option) => ({ id: option.id, label: m.global.ranges[option.id] }))}
          value={range}
          onChange={setRange}
          colors={theme.colors}
          variant="filter"
          gap={layout.compact ? 12 : 16}
        />
        {providerOptions.length > 1 ? (
          <TextTabs
            options={providerOptions}
            value={providerFilter}
            onChange={setProviderFilter}
            colors={theme.colors}
            variant="filter"
            gap={layout.compact ? 12 : 16}
          />
        ) : null}
      </View>

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
          from={from}
          colors={theme.colors}
          compact={layout.compact}
          mode={heatmapMode}
          onModeChange={setHeatmapMode}
          modeOptions={[
            { id: "daily", label: m.global.heatmapModes.daily },
            { id: "weekly", label: m.global.heatmapModes.weekly },
            { id: "cumulative", label: m.global.heatmapModes.cumulative },
          ]}
        />
      ) : null}

      {showContent ? (
        <AgentCreations
          days={histogramQuery.data?.days ?? []}
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
              items={(
                rankKind === "skills"
                  ? lists.skills
                  : rankKind === "mcp"
                    ? lists.mcp
                    : lists.models
              ).slice(0, LIST_LIMIT)}
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
