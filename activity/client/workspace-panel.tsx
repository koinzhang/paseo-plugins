import {
  type PluginWorkspacePanelProps,
  usePaseo,
  useRpc,
  useWorkspace,
} from "@getpaseo/plugin/client";
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
  type ViewStyle,
} from "react-native";
import { ACTIVITY_LIST_LIMIT } from "../shared/insights.ts";
import {
  providerLabel,
  type AgentUsageItem,
  usageAgentsRpc,
  usageMcpByToolRpc,
  usageSkillsByNameRpc,
  usageSummaryRpc,
} from "../shared/usage.ts";
import { formatDisplayName, formatLocalDateTime } from "../shared/format.ts";
import { RANGE_OPTIONS, rangeFrom, type RangeId } from "./range.ts";
import { UsageStats } from "./usage-stats.tsx";

type AgentSort = "created" | "updated" | "name" | "messages" | "status";
type AgentGroup = "none" | "provider";
type AgentShow = "active" | "archived";
type MenuFlyout = "sort" | "group" | "show";

type AgentStatusInfo = { rank: number; updatedAt: string | null };

/** Host MenuFlyout overlap between root surface and submenu (`SUBMENU_OVERLAP`). */
const MENU_SUBMENU_OVERLAP = 5;
const MENU_WIDTH = 232;

const SORT_OPTIONS: ReadonlyArray<{ id: AgentSort; label: string }> = [
  { id: "created", label: "Created" },
  { id: "updated", label: "Updated" },
  { id: "name", label: "Name" },
  { id: "messages", label: "Messages" },
  { id: "status", label: "Status" },
];

/** 0 = attention-worthy, then running / idle / initializing / closed (unknown). */
function attentionRank(agent: {
  status?: string;
  requiresAttention?: boolean;
  attentionReason?: string | null;
}): number {
  if (
    agent.requiresAttention === true ||
    agent.attentionReason === "permission" ||
    agent.attentionReason === "error" ||
    agent.status === "error"
  ) {
    return 0;
  }
  if (agent.status === "running") return 1;
  if (agent.status === "idle") return 2;
  if (agent.status === "initializing") return 3;
  return 4;
}

const GROUP_OPTIONS: ReadonlyArray<{ id: AgentGroup; label: string }> = [
  { id: "none", label: "None" },
  { id: "provider", label: "Provider" },
];

const SHOW_OPTIONS: ReadonlyArray<{ id: AgentShow; label: string }> = [
  { id: "active", label: "Active" },
  { id: "archived", label: "Archived" },
];

function optionLabel<T extends string>(
  options: ReadonlyArray<{ id: T; label: string }>,
  id: T,
): string {
  return options.find((option) => option.id === id)?.label ?? id;
}

type MenuStyles = {
  menuPage: ViewStyle;
  menuRow: ViewStyle;
  menuRowHighlighted: ViewStyle;
  menuLabel: TextStyle;
  menuValue: TextStyle;
  menuTrailing: ViewStyle;
  menuOption: ViewStyle;
  menuOptionLabel: TextStyle;
  menuSurface: ViewStyle;
  menuRootWrap: ViewStyle;
  menuFlyout: ViewStyle;
};

function MenuSubTrigger({
  label,
  value,
  active,
  onOpen,
  styles,
  chevronColor,
}: {
  label: string;
  value?: string;
  active: boolean;
  onOpen: () => void;
  styles: MenuStyles;
  chevronColor: string;
}): ReactNode {
  return (
    <View
      // Web: open flyout on hover like host MenuSubTrigger.
      {...({ onPointerEnter: onOpen } as object)}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: active }}
        onPress={onOpen}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.menuRow,
          active || pressed || hovered ? styles.menuRowHighlighted : null,
        ]}
      >
        <Text style={styles.menuLabel} numberOfLines={1}>
          {label}
        </Text>
        <View style={styles.menuTrailing}>
          {value ? (
            <Text style={styles.menuValue} numberOfLines={1}>
              {value}
            </Text>
          ) : null}
          <Icon name="ChevronRight" size={14} color={chevronColor} />
        </View>
      </Pressable>
    </View>
  );
}

function MenuOptionList({
  options,
  selectedId,
  onSelect,
  styles,
  checkColor,
}: {
  options: ReadonlyArray<{ id: string; label: string }>;
  selectedId: string;
  onSelect: (id: string) => void;
  styles: MenuStyles;
  checkColor: string;
}): ReactNode {
  return (
    <View style={styles.menuPage}>
      {options.map((option) => (
        <Pressable
          key={option.id}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedId === option.id }}
          onPress={() => onSelect(option.id)}
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
            styles.menuOption,
            pressed || hovered ? styles.menuRowHighlighted : null,
          ]}
        >
          <Text style={styles.menuOptionLabel} numberOfLines={1}>
            {option.label}
          </Text>
          {selectedId === option.id ? (
            <View style={styles.menuTrailing}>
              <Icon name="Check" size={16} color={checkColor} />
            </View>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

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

/** Workspace-scoped Activity for the Explorer (024). */
export function WorkspaceActivityPanel({
  theme,
  layout,
  workspaceId,
  navigation,
}: PluginWorkspacePanelProps) {
  const [range, setRange] = useState<RangeId>("all");
  const [agentSort, setAgentSort] = useState<AgentSort>("created");
  const [agentGroup, setAgentGroup] = useState<AgentGroup>("none");
  const [agentShow, setAgentShow] = useState<AgentShow>("active");
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuFlyout, setMenuFlyout] = useState<MenuFlyout | null>(null);
  const [rankKind, setRankKind] = useState<RankKind>("skills");
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

  const paseo = usePaseo();
  const statuses = useQuery({
    refetchInterval: 15_000,
    retry: false,
    queryKey: ["activity", "workspace-agent-status", workspaceId],
    queryFn: async () => {
      const result = await paseo.agents.list({
        filter: { includeArchived: true },
        page: { limit: 200 },
      });
      const map: Record<string, AgentStatusInfo> = {};
      for (const entry of result.entries) {
        const agent = entry.agent;
        if (agent.workspaceId && agent.workspaceId !== workspaceId) continue;
        map[agent.id] = {
          rank: attentionRank(agent),
          updatedAt: agent.updatedAt ?? null,
        };
      }
      return map;
    },
  });

  const agentItems = agents.data?.items ?? [];
  const visibleAgentItems = useMemo(() => {
    const filtered = agentItems.filter((item) =>
      agentShow === "archived" ? item.archivedAt != null : item.archivedAt == null,
    );
    const byId = statuses.data;
    const byName = (a: AgentUsageItem, b: AgentUsageItem) =>
      (a.title ?? a.agentId).localeCompare(b.title ?? b.agentId);
    const updatedAt = (item: AgentUsageItem) =>
      item.updatedAt ?? byId?.[item.agentId]?.updatedAt ?? item.lastActivityAt ?? "";
    return filtered.slice().sort((a, b) => {
      if (agentSort === "created") {
        return (b.createdAt ?? "").localeCompare(a.createdAt ?? "") || byName(a, b);
      }
      if (agentSort === "updated") {
        return updatedAt(b).localeCompare(updatedAt(a)) || byName(a, b);
      }
      if (agentSort === "name") {
        return byName(a, b);
      }
      if (agentSort === "messages") {
        return b.messageCount - a.messageCount || byName(a, b);
      }
      const rankA = byId?.[a.agentId]?.rank ?? 4;
      const rankB = byId?.[b.agentId]?.rank ?? 4;
      return rankA - rankB || updatedAt(b).localeCompare(updatedAt(a)) || byName(a, b);
    });
  }, [agentItems, agentShow, agentSort, statuses.data]);

  const agentGroups = useMemo(() => {
    if (agentGroup === "none") return null;
    const map = new Map<string, AgentUsageItem[]>();
    for (const item of visibleAgentItems) {
      const list = map.get(item.provider);
      if (list) list.push(item);
      else map.set(item.provider, [item]);
    }
    return [...map.entries()].sort((a, b) =>
      providerLabel(a[0]).localeCompare(providerLabel(b[0])),
    );
  }, [agentGroup, visibleAgentItems]);
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
    { label: "Shell calls", value: (summary.data?.shellCalls ?? 0).toLocaleString() },
    { label: "File reads", value: (summary.data?.fileReads ?? 0).toLocaleString() },
    { label: "File writes", value: (summary.data?.fileWrites ?? 0).toLocaleString() },
    {
      label: "Messages",
      value: agentItems.reduce((sum, item) => sum + item.messageCount, 0).toLocaleString(),
    },
  ];

  const showAgents = agentItems.length > 0;
  const showRank = skillItems.length > 0 || mcpItems.length > 0;
  const showContent = showAgents || showRank;

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
        fontSize: 14,
        fontWeight: "500" as const,
        flexShrink: 1,
      },
      sectionHeaderRow: {
        flexDirection: "row" as const,
        alignItems: "baseline" as const,
        justifyContent: "space-between" as const,
        flexWrap: "wrap" as const,
        gap: 12,
      },
      titleAction: {
        padding: 4,
        borderRadius: 6,
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
      agentGroup: {
        gap: 4,
      },
      groupLabel: {
        color: theme.colors.foregroundMuted,
        fontSize: 12,
        fontWeight: "600" as const,
        paddingTop: 12,
        paddingBottom: 2,
      },
      menuPage: {
        paddingVertical: 4,
      },
      // Matches host MenuItem: inset chip fill, 28/40 row height, 6pt radius.
      menuRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        minHeight: layout.compact ? 40 : 28,
        gap: 8,
        marginHorizontal: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: "transparent",
        borderRadius: 6,
      },
      menuRowHighlighted: {
        backgroundColor: theme.colors.surface2,
      },
      menuLabel: {
        flexShrink: 1,
        minWidth: 0,
        color: theme.colors.foreground,
        fontSize: 14,
        lineHeight: 18,
        fontWeight: "normal" as const,
      },
      menuValue: {
        color: theme.colors.foregroundMuted,
        fontSize: 14,
        lineHeight: 18,
        flexShrink: 1,
      },
      menuTrailing: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 6,
        marginLeft: "auto" as const,
        flexShrink: 0,
      },
      menuOption: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        minHeight: layout.compact ? 40 : 28,
        gap: 8,
        marginHorizontal: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: "transparent",
        borderRadius: 6,
      },
      menuOptionLabel: {
        flexShrink: 1,
        minWidth: 0,
        color: theme.colors.foreground,
        fontSize: 14,
        lineHeight: 18,
        fontWeight: "normal" as const,
      },
      agentsSection: {
        gap: 12,
        position: "relative" as const,
        overflow: "visible" as const,
      },
      agentsHeaderWrap: {
        position: "relative" as const,
        zIndex: 20,
        overflow: "visible" as const,
      },
      menuBackdrop: {
        position: "absolute" as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
      },
      // Matches host MenuSurface / FloatingSurface chrome (sidebar display menu).
      menuSurface: {
        width: MENU_WIDTH,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface1,
        shadowColor: "rgba(0, 0, 0, 0.04)",
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 16,
        elevation: 4,
      },
      menuRootWrap: {
        position: "absolute" as const,
        top: "100%" as const,
        right: 0,
        marginTop: 4,
        zIndex: 20,
        overflow: "visible" as const,
      },
      // Sibling flyout to the left of the root (menu is end-aligned; host opens right into content).
      menuFlyout: {
        position: "absolute" as const,
        right: MENU_WIDTH - MENU_SUBMENU_OVERLAP,
        width: MENU_WIDTH,
        zIndex: 21,
      },
    }),
    [theme, layout.compact, padding],
  );

  const rowHeight = layout.compact ? 40 : 28;
  const flyoutTop = menuFlyout
    ? 4 + ({ sort: 0, group: 1, show: 2 }[menuFlyout] * rowHeight)
    : 0;
  const flyoutOptions: ReadonlyArray<{ id: string; label: string }> =
    menuFlyout === "sort"
      ? SORT_OPTIONS
      : menuFlyout === "group"
        ? GROUP_OPTIONS
        : menuFlyout === "show"
          ? SHOW_OPTIONS
          : [];
  const flyoutValue: string =
    menuFlyout === "sort"
      ? agentSort
      : menuFlyout === "group"
        ? agentGroup
        : menuFlyout === "show"
          ? agentShow
          : "";

  function closeMenu() {
    setMenuOpen(false);
    setMenuFlyout(null);
  }

  function selectMenuOption(id: string) {
    if (menuFlyout === "sort") setAgentSort(id as AgentSort);
    else if (menuFlyout === "group") setAgentGroup(id as AgentGroup);
    else if (menuFlyout === "show") setAgentShow(id as AgentShow);
    closeMenu();
  }

  function renderAgentRow(item: AgentUsageItem): ReactNode {
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
            {providerLabel(item.provider)} · {item.callCount} calls · {item.messageCount} messages
            {item.archivedAt ? ` · Archived ${formatLocalDateTime(item.archivedAt)}` : ""}
          </Text>
        </View>
        <CountText value={activity} styles={styles} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.header}>
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
        <View style={styles.agentsSection}>
          <View style={styles.agentsHeaderWrap}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Agents</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Agent display options"
                accessibilityState={{ expanded: menuOpen }}
                hitSlop={8}
                onPress={() => {
                  if (menuOpen) closeMenu();
                  else {
                    setMenuFlyout(null);
                    setMenuOpen(true);
                  }
                }}
                style={styles.titleAction}
              >
                <Icon name="Settings2" size={14} color={theme.colors.foregroundMuted} />
              </Pressable>
            </View>
            {menuOpen ? (
              <View style={styles.menuRootWrap}>
                <View style={styles.menuSurface}>
                  <View style={styles.menuPage}>
                    <MenuSubTrigger
                      label="Sort"
                      value={optionLabel(SORT_OPTIONS, agentSort)}
                      active={menuFlyout === "sort"}
                      onOpen={() => setMenuFlyout("sort")}
                      styles={styles}
                      chevronColor={theme.colors.foregroundMuted}
                    />
                    <MenuSubTrigger
                      label="Group"
                      value={optionLabel(GROUP_OPTIONS, agentGroup)}
                      active={menuFlyout === "group"}
                      onOpen={() => setMenuFlyout("group")}
                      styles={styles}
                      chevronColor={theme.colors.foregroundMuted}
                    />
                    <MenuSubTrigger
                      label="Show"
                      value={optionLabel(SHOW_OPTIONS, agentShow)}
                      active={menuFlyout === "show"}
                      onOpen={() => setMenuFlyout("show")}
                      styles={styles}
                      chevronColor={theme.colors.foregroundMuted}
                    />
                  </View>
                </View>
                {menuFlyout ? (
                  <View
                    style={[styles.menuSurface, styles.menuFlyout, { top: flyoutTop }]}
                    {...({ onPointerEnter: () => setMenuFlyout(menuFlyout) } as object)}
                  >
                    <MenuOptionList
                      options={flyoutOptions}
                      selectedId={flyoutValue}
                      onSelect={selectMenuOption}
                      styles={styles}
                      checkColor={theme.colors.foregroundMuted}
                    />
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
          {menuOpen ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close agent display options"
              onPress={closeMenu}
              style={styles.menuBackdrop}
            />
          ) : null}
          <View style={styles.panel}>
            {agentGroups
              ? agentGroups.map(([provider, items]) => (
                  <View key={provider} style={styles.agentGroup}>
                    <Text style={styles.groupLabel}>{providerLabel(provider)}</Text>
                    {items.map(renderAgentRow)}
                  </View>
                ))
              : visibleAgentItems.map(renderAgentRow)}
            {visibleAgentItems.length === 0 ? (
              <Text style={styles.empty}>
                {agentShow === "archived" ? "No archived agents" : "No active agents"}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {showRank ? (
        <View style={{ gap: 12 }}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{rankTitle(rankKind)}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={rankAction(rankKind).accessibilityLabel}
              hitSlop={8}
              onPress={() => setRankKind((prev) => (prev === "skills" ? "mcp" : "skills"))}
              style={styles.titleAction}
            >
              <Icon
                name={rankAction(rankKind).icon}
                size={16}
                color={theme.colors.foregroundMuted}
              />
            </Pressable>
          </View>
          <View style={styles.panel}>
            {rankKind === "skills"
              ? skillItems.map((item) => (
                  <View key={item.skillName} style={styles.listRow}>
                    <Icon name="Sparkles" size={18} color={theme.colors.foregroundMuted} />
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
            {(rankKind === "skills" ? skillItems.length : mcpItems.length) === 0 ? (
              <Text style={styles.empty}>
                {rankKind === "skills" ? "No skills yet" : "No MCP yet"}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}
