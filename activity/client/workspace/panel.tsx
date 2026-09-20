import {
  type PluginWorkspacePanelProps,
  usePaseo,
  useRpc,
  useSettings,
} from "@getpaseo/plugin/client";
import { useToast } from "@getpaseo/plugin/client/react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRegisterOpenAgent } from "../open-agent.ts";
import { useWorkspaceAgentStatuses } from "../use-workspace-agent-statuses.ts";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { ACTIVITY_LIST_LIMIT } from "../../shared/insights.ts";
import {
  EXPLORER_AGENT_DISPLAY_DEFAULTS,
  explorerAgentDisplaySettings,
  type ExplorerAgentDisplayValues,
} from "../../shared/explorer-agent-display.ts";
import {
  type AgentUsageItem,
  usageAgentUnarchiveRpc,
  usageAgentsRpc,
  usageHostInfoRpc,
  usageMcpByToolRpc,
  usageSkillsByNameRpc,
  usageSummaryRpc,
} from "../../shared/usage.ts";
import { useAppLanguage } from "../use-app-language.ts";
import { useWorkspaceActivityRefresh } from "../use-agent-turn-end.ts";
import { UsageStats } from "../usage-stats.tsx";
import { AgentsSection } from "./agents-section.tsx";
import { WorkspaceAgentLiveStatusSync } from "./agent-live-status-sync.tsx";
import {
  AGENT_HEADER_HEIGHT,
  GROUP_OPTIONS,
  LIFECYCLE_FILTER_OPTIONS,
  MENU_SUBMENU_OVERLAP,
  MENU_WIDTH,
  SHOW_FIELD_OPTIONS,
  SORT_OPTIONS,
  STATUS_FILTER_OPTIONS,
  TERMINAL_REFETCH_MS,
  agentUpdatedAt,
  matchesAgentFilters,
  optionLabel,
  type AgentGroup,
  type AgentLifecycleFilter,
  type AgentShowField,
  type AgentSort,
  type AgentStatusFilter,
  type MenuFlyout,
  type MenuOption,
} from "./constants.ts";
import { MenuOptionList, MenuSubTrigger } from "./display-menu.tsx";
import { matchesAgentTitle } from "./filters.ts";
import { RankSection } from "./rank-section.tsx";
import { TerminalsSection, type TerminalListItem } from "./terminals-section.tsx";

type RankKind = "skills" | "mcp";

const MONO = Platform.select({ ios: "Menlo", default: "monospace" });

/** Workspace-scoped Activity for the Explorer (024 / 031). */
export function WorkspaceActivityPanel({
  theme,
  layout,
  workspaceId,
  navigation,
}: PluginWorkspacePanelProps) {
  const displaySettings = useSettings(explorerAgentDisplaySettings);
  const displayValues: ExplorerAgentDisplayValues =
    displaySettings.status === "ready"
      ? displaySettings.values
      : EXPLORER_AGENT_DISPLAY_DEFAULTS;
  const agentSort = displayValues.sort;
  const agentGroup = displayValues.group;
  const agentShowFields = useMemo(
    () => new Set(displayValues.show),
    [displayValues.show],
  );
  const agentStatusFilters = useMemo(
    () => new Set(displayValues.status),
    [displayValues.status],
  );
  const agentLifecycleFilters = useMemo(
    () => new Set(displayValues.lifecycle),
    [displayValues.lifecycle],
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuFlyout, setMenuFlyout] = useState<MenuFlyout | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; right: number } | null>(null);
  const [agentSearchQuery, setAgentSearchQuery] = useState("");
  const [rankKind, setRankKind] = useState<RankKind>("skills");
  const [busyAgentId, setBusyAgentId] = useState<string | null>(null);
  const [busyTerminalId, setBusyTerminalId] = useState<string | null>(null);
  const padding = layout.compact ? 16 : 24;
  const locale = useAppLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();
  const openAgent = navigation?.openAgent;
  useRegisterOpenAgent(openAgent);
  const rootRef = useRef<View>(null);
  const triggerRef = useRef<View>(null);

  function persistDisplay(next: ExplorerAgentDisplayValues) {
    if (displaySettings.status !== "ready") return;
    void displaySettings.save(next, displaySettings.revision);
  }

  const summaryRpc = useRpc(usageSummaryRpc);
  const agentsRpc = useRpc(usageAgentsRpc);
  const unarchiveAgentRpc = useRpc(usageAgentUnarchiveRpc);
  const skillsRpc = useRpc(usageSkillsByNameRpc);
  const mcpRpc = useRpc(usageMcpByToolRpc);
  const hostInfoRpc = useRpc(usageHostInfoRpc);

  const agentsQueryKey = ["activity", "workspace-agents", workspaceId] as const;
  const terminalsQueryKey = ["activity", "workspace-terminals", workspaceId] as const;

  const summary = useQuery({
    refetchInterval: 15_000,
    retry: false,
    queryKey: ["activity", "workspace-summary", workspaceId],
    queryFn: () => summaryRpc({ workspaceId }),
  });

  const agents = useQuery({
    refetchInterval: 15_000,
    retry: false,
    queryKey: agentsQueryKey,
    queryFn: () => agentsRpc({ workspaceId }),
  });

  const skills = useQuery({
    refetchInterval: 15_000,
    retry: false,
    queryKey: ["activity", "workspace-skills", workspaceId],
    queryFn: () => skillsRpc({ workspaceId }),
  });

  const mcp = useQuery({
    refetchInterval: 15_000,
    retry: false,
    queryKey: ["activity", "workspace-mcp", workspaceId],
    queryFn: () => mcpRpc({ workspaceId }),
  });

  const paseo = usePaseo();
  const terminals = useQuery({
    refetchInterval: TERMINAL_REFETCH_MS,
    retry: false,
    queryKey: terminalsQueryKey,
    queryFn: () => paseo.terminals.list({ workspaceId }),
  });

  const hostInfo = useQuery({
    staleTime: Infinity,
    retry: false,
    queryKey: ["activity", "host-info"],
    queryFn: () => hostInfoRpc({}),
  });

  const statuses = useWorkspaceAgentStatuses(workspaceId);

  useWorkspaceActivityRefresh(workspaceId, () => {
    void queryClient.invalidateQueries({
      queryKey: ["activity", "workspace-summary", workspaceId],
    });
    void queryClient.invalidateQueries({ queryKey: agentsQueryKey });
    void queryClient.invalidateQueries({
      queryKey: ["activity", "workspace-skills", workspaceId],
    });
    void queryClient.invalidateQueries({
      queryKey: ["activity", "workspace-mcp", workspaceId],
    });
  });

  const agentItems = agents.data?.items ?? [];
  const liveStatusAgentIds = useMemo(
    () => agentItems.map((item) => item.agentId),
    [agentItems],
  );
  const visibleAgentItems = useMemo(() => {
    const byId = statuses.data;
    const filtered = agentItems
      .filter((item) =>
        matchesAgentFilters(item, agentStatusFilters, agentLifecycleFilters, byId),
      )
      .filter((item) => matchesAgentTitle(item, agentSearchQuery));
    const byName = (a: AgentUsageItem, b: AgentUsageItem) =>
      (a.title ?? a.agentId).localeCompare(b.title ?? b.agentId);
    return filtered.slice().sort((a, b) => {
      if (agentSort === "name") return byName(a, b);
      if (agentSort === "messages") {
        return b.messageCount - a.messageCount || byName(a, b);
      }
      if (agentSort === "created") {
        const ca = a.createdAt ?? "";
        const cb = b.createdAt ?? "";
        return cb.localeCompare(ca) || byName(a, b);
      }
      if (agentSort === "status") {
        const rankA = byId?.[a.agentId]?.rank ?? 4;
        const rankB = byId?.[b.agentId]?.rank ?? 4;
        if (rankA !== rankB) return rankA - rankB;
        const ua = agentUpdatedAt(a, byId) ?? "";
        const ub = agentUpdatedAt(b, byId) ?? "";
        return ub.localeCompare(ua) || byName(a, b);
      }
      // updated (default)
      const ua = agentUpdatedAt(a, byId) ?? "";
      const ub = agentUpdatedAt(b, byId) ?? "";
      return ub.localeCompare(ua) || byName(a, b);
    });
  }, [
    agentItems,
    agentLifecycleFilters,
    agentSearchQuery,
    agentSort,
    agentStatusFilters,
    statuses.data,
  ]);

  const allSkills = useMemo(
    () => (skills.data?.items ?? []).filter((item) => item.total > 0),
    [skills.data],
  );
  const allMcp = useMemo(
    () => (mcp.data?.items ?? []).filter((item) => item.count > 0),
    [mcp.data],
  );
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
      value: (summary.data?.messageCount ?? 0).toLocaleString(),
    },
  ];

  const terminalItems = terminals.data?.entries ?? [];
  const showAgents = agentItems.length > 0;
  const showRank = skillItems.length > 0 || mcpItems.length > 0;
  const showRankToggle = skillItems.length > 0 && mcpItems.length > 0;
  const showTerminals = terminalItems.length > 0;
  const showContent = showAgents || showRank || showTerminals;

  useEffect(() => {
    if (skillItems.length === 0 && mcpItems.length === 0) return;
    if (rankKind === "skills" && skillItems.length === 0) setRankKind("mcp");
    else if (rankKind === "mcp" && mcpItems.length === 0) setRankKind("skills");
  }, [skillItems.length, mcpItems.length, rankKind]);

  const styles = useMemo(
    () => ({
      shell: {
        flex: 1,
        minHeight: 0,
        minWidth: 0,
      },
      screen: {
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        overflow: "hidden" as const,
        backgroundColor: theme.colors.surface0,
      },
      scroll: {
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        ...(Platform.OS === "web"
          ? ({ scrollbarWidth: "none", msOverflowStyle: "none" } as object)
          : null),
      },
      content: {
        padding,
        paddingBottom: padding + 24,
        gap: layout.compact ? 20 : 26,
        maxWidth: 1000,
        width: "100%" as const,
        alignSelf: "center" as const,
      },
      sectionHeaderRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        gap: 8,
      },
      agentsHeaderRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        height: AGENT_HEADER_HEIGHT,
      },
      agentsHeaderSearchSlot: {
        flex: 1,
        minWidth: 0,
        flexDirection: "row" as const,
        justifyContent: "flex-end" as const,
        overflow: "hidden" as const,
      },
      titleAction: {
        width: 24,
        height: 24,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        borderRadius: 6,
        flexShrink: 0,
      },
      headerActions: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 2,
        flexShrink: 0,
        marginLeft: 2,
      },
      searchField: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 6,
        height: AGENT_HEADER_HEIGHT,
        paddingHorizontal: 10,
        borderRadius: AGENT_HEADER_HEIGHT / 2,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface1,
        overflow: "hidden" as const,
      },
      searchInput: {
        flex: 1,
        minWidth: 0,
        padding: 0,
        margin: 0,
        color: theme.colors.foreground,
        fontSize: 13,
        lineHeight: 18,
        ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
      },
      sectionTitle: {
        color: theme.colors.foreground,
        fontSize: 16,
        fontWeight: "600" as const,
        flexShrink: 0,
        letterSpacing: -0.3,
        lineHeight: AGENT_HEADER_HEIGHT,
      },
      panel: {
        gap: 2,
        overflow: "hidden" as const,
      },
      listRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 12,
        paddingVertical: 6,
      },
      agentListRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 10,
        paddingVertical: 6,
      },
      agentIconWrap: {
        width: 18,
        height: 18,
        alignItems: "center" as const,
        justifyContent: "center" as const,
      },
      runningBadge: {
        position: "absolute" as const,
        right: -4,
        bottom: -4,
        width: 13,
        height: 13,
        borderRadius: 6.5,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        backgroundColor: theme.colors.surface0,
      },
      subAgentBadge: {
        position: "absolute" as const,
        right: -5,
        bottom: -5,
        minWidth: 14,
        height: 14,
        paddingHorizontal: 3,
        borderRadius: 7,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        backgroundColor: theme.colors.surface0,
        borderWidth: 1,
        borderColor: theme.colors.border,
      },
      subAgentBadgeText: {
        color: theme.colors.foregroundMuted,
        fontSize: 9,
        fontWeight: "700" as const,
        fontVariant: ["tabular-nums" as const],
        lineHeight: 11,
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
      permissionBadge: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 3,
        height: 18,
        paddingHorizontal: 5,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface1,
        flexShrink: 0,
      },
      permissionBadgeText: {
        color: theme.colors.statusWarning,
        fontSize: 11,
        fontWeight: "600" as const,
        fontVariant: ["tabular-nums" as const],
      },
      terminalRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 10,
        paddingVertical: 6,
      },
      terminalPreview: {
        marginLeft: 28,
        marginBottom: 4,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 6,
        backgroundColor: theme.colors.surface1,
        gap: 2,
      },
      terminalLine: {
        color: theme.colors.foregroundMuted,
        fontFamily: MONO,
        fontSize: 11,
        lineHeight: 15,
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
      pagerRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        gap: 12,
        paddingTop: 8,
        paddingBottom: 4,
      },
      pagerButton: {
        width: 28,
        height: 28,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        borderRadius: 6,
      },
      pagerButtonDisabled: {
        opacity: 0.35,
      },
      pagerLabel: {
        color: theme.colors.foregroundMuted,
        fontSize: 12,
        fontVariant: ["tabular-nums" as const],
      },
      menuPage: {
        paddingVertical: 4,
      },
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
      menuLeadingSlot: {
        width: 16,
        alignItems: "center" as const,
        justifyContent: "center" as const,
      },
      agentsSection: {
        gap: 12,
        position: "relative" as const,
      },
      agentsHeaderWrap: {
        position: "relative" as const,
      },
      menuBackdrop: {
        position: (Platform.OS === "web" ? "fixed" : "absolute") as "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 30,
      },
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
        position: (Platform.OS === "web" ? "fixed" : "absolute") as "absolute",
        zIndex: 31,
        overflow: "visible" as const,
      },
      menuFlyout: {
        position: "absolute" as const,
        right: MENU_WIDTH - MENU_SUBMENU_OVERLAP,
        width: MENU_WIDTH,
        zIndex: 32,
      },
      menuSeparator: {
        height: 1,
        marginVertical: 4,
        backgroundColor: theme.colors.border,
      },
    }),
    [theme, layout.compact, padding],
  );

  const rowHeight = layout.compact ? 40 : 28;
  const flyoutTop = menuFlyout
    ? 4 +
      ({ sort: 0, group: 1, show: 2, status: 3, lifecycle: 4 }[menuFlyout] * rowHeight) +
      (menuFlyout === "status" || menuFlyout === "lifecycle" ? 9 : 0)
    : 0;
  const flyoutOptions: ReadonlyArray<MenuOption> =
    menuFlyout === "sort"
      ? SORT_OPTIONS
      : menuFlyout === "group"
        ? GROUP_OPTIONS
        : menuFlyout === "show"
          ? SHOW_FIELD_OPTIONS
          : menuFlyout === "status"
            ? STATUS_FILTER_OPTIONS
            : menuFlyout === "lifecycle"
              ? LIFECYCLE_FILTER_OPTIONS
              : [];
  const flyoutSelectedId: string | undefined =
    menuFlyout === "sort"
      ? agentSort
      : menuFlyout === "group"
        ? agentGroup
        : undefined;
  const flyoutSelectedIds: ReadonlySet<string> | undefined =
    menuFlyout === "show"
      ? agentShowFields
      : menuFlyout === "status"
        ? agentStatusFilters
        : menuFlyout === "lifecycle"
          ? agentLifecycleFilters
          : undefined;

  function closeMenu() {
    setMenuOpen(false);
    setMenuFlyout(null);
    setMenuAnchor(null);
  }

  function openMenu() {
    const trigger = triggerRef.current;
    const root = rootRef.current;
    if (!trigger || !root) {
      setMenuAnchor({ top: 48, right: 16 });
      setMenuFlyout(null);
      setMenuOpen(true);
      return;
    }
    trigger.measureInWindow((tx, ty, tw, th) => {
      if (Platform.OS === "web") {
        setMenuAnchor({
          top: ty + th + 4,
          right: Dimensions.get("window").width - (tx + tw),
        });
        setMenuFlyout(null);
        setMenuOpen(true);
        return;
      }
      root.measureInWindow((rx, ry, rw) => {
        setMenuAnchor({
          top: ty + th - ry + 4,
          right: rx + rw - (tx + tw),
        });
        setMenuFlyout(null);
        setMenuOpen(true);
      });
    });
  }

  function selectMenuOption(id: string) {
    if (menuFlyout === "sort") {
      persistDisplay({ ...displayValues, sort: id as AgentSort });
      closeMenu();
      return;
    }
    if (menuFlyout === "group") {
      persistDisplay({ ...displayValues, group: id as AgentGroup });
      closeMenu();
      return;
    }
    if (menuFlyout === "status") {
      const status = id as AgentStatusFilter;
      const next = new Set(displayValues.status);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      persistDisplay({ ...displayValues, status: [...next] });
      return;
    }
    if (menuFlyout === "lifecycle") {
      const lifecycle = id as AgentLifecycleFilter;
      const next = new Set(displayValues.lifecycle);
      if (next.has(lifecycle)) next.delete(lifecycle);
      else next.add(lifecycle);
      persistDisplay({ ...displayValues, lifecycle: [...next] });
      return;
    }
    if (menuFlyout === "show") {
      const field = id as AgentShowField;
      const next = new Set(displayValues.show);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      persistDisplay({ ...displayValues, show: [...next] });
    }
  }

  function patchAgentArchivedAt(agentId: string, archivedAt: string | null) {
    queryClient.setQueryData<{ items: AgentUsageItem[] }>(agentsQueryKey, (prev) => {
      if (!prev) return prev;
      return {
        items: prev.items.map((row) =>
          row.agentId === agentId ? { ...row, archivedAt } : row,
        ),
      };
    });
  }

  async function archiveAgent(item: AgentUsageItem) {
    if (busyAgentId != null) return;
    setBusyAgentId(item.agentId);
    const previous = item.archivedAt;
    patchAgentArchivedAt(item.agentId, new Date().toISOString());
    try {
      await paseo.agents.ref(item.agentId).archive();
      await queryClient.invalidateQueries({ queryKey: agentsQueryKey });
      await queryClient.invalidateQueries({
        queryKey: ["activity", "workspace-agent-status", workspaceId],
      });
    } catch (err) {
      patchAgentArchivedAt(item.agentId, previous);
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyAgentId(null);
    }
  }

  async function unarchiveAgent(item: AgentUsageItem) {
    if (busyAgentId != null) return;
    setBusyAgentId(item.agentId);
    const previous = item.archivedAt;
    patchAgentArchivedAt(item.agentId, null);
    try {
      await unarchiveAgentRpc({ agentId: item.agentId });
      await queryClient.invalidateQueries({ queryKey: agentsQueryKey });
      await queryClient.invalidateQueries({
        queryKey: ["activity", "workspace-agent-status", workspaceId],
      });
    } catch (err) {
      patchAgentArchivedAt(item.agentId, previous);
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyAgentId(null);
    }
  }

  function patchTerminalRemoved(terminalId: string) {
    queryClient.setQueryData<{ entries: TerminalListItem[]; requestId: string }>(
      terminalsQueryKey,
      (prev) =>
        prev
          ? { ...prev, entries: prev.entries.filter((entry) => entry.id !== terminalId) }
          : prev,
    );
  }

  async function closeTerminal(item: TerminalListItem) {
    if (busyTerminalId != null) return;
    setBusyTerminalId(item.id);
    const previous = queryClient.getQueryData<{
      entries: TerminalListItem[];
      requestId: string;
    }>(terminalsQueryKey);
    patchTerminalRemoved(item.id);
    try {
      await paseo.terminals.ref(item.id).kill();
      queryClient.removeQueries({
        queryKey: ["activity", "terminal-capture", workspaceId, item.id],
      });
      await queryClient.invalidateQueries({ queryKey: terminalsQueryKey });
    } catch (err) {
      if (previous) queryClient.setQueryData(terminalsQueryKey, previous);
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyTerminalId(null);
    }
  }

  return (
    <View ref={rootRef} collapsable={false} style={styles.shell}>
      <View style={styles.screen}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          scrollEnabled={!menuOpen}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        >
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
            <>
              <WorkspaceAgentLiveStatusSync
                agentIds={liveStatusAgentIds}
                workspaceId={workspaceId}
              />
              <AgentsSection
              theme={theme}
              styles={styles}
              locale={locale}
              agentGroup={agentGroup}
              agentShowFields={agentShowFields}
              statuses={statuses.data}
              agentItems={agentItems}
              visibleAgentItems={visibleAgentItems}
              statusFilters={agentStatusFilters}
              statusFiltersEmpty={
                agentStatusFilters.size === 0 || agentLifecycleFilters.size === 0
              }
              busyAgentId={busyAgentId}
              openAgent={openAgent}
              menuOpen={menuOpen}
              onToggleMenu={() => {
                if (menuOpen) closeMenu();
                else openMenu();
              }}
              triggerRef={triggerRef}
              searchQuery={agentSearchQuery}
              onSearchQueryChange={setAgentSearchQuery}
              onArchive={(item) => void archiveAgent(item)}
              onUnarchive={(item) => void unarchiveAgent(item)}
              resetKey={workspaceId}
            />
            </>
          ) : null}

          {showTerminals ? (
            <TerminalsSection
              workspaceId={workspaceId}
              terminalItems={terminalItems}
              busyTerminalId={busyTerminalId}
              homeDir={hostInfo.data?.homeDir}
              mutedColor={theme.colors.foregroundMuted}
              styles={styles}
              onClose={(item) => void closeTerminal(item)}
            />
          ) : null}

          {showRank ? (
            <RankSection
              rankKind={rankKind}
              onToggleKind={() =>
                setRankKind((prev) => (prev === "skills" ? "mcp" : "skills"))
              }
              showToggle={showRankToggle}
              skillItems={skillItems}
              mcpItems={mcpItems}
              mutedColor={theme.colors.foregroundMuted}
              styles={styles}
            />
          ) : null}
        </ScrollView>
      </View>

      {menuOpen ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close agent display options"
          onPress={closeMenu}
          style={styles.menuBackdrop}
        />
      ) : null}

      {menuOpen && menuAnchor ? (
        <View
          pointerEvents="box-none"
          style={[styles.menuRootWrap, { top: menuAnchor.top, right: menuAnchor.right }]}
        >
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
                active={menuFlyout === "show"}
                onOpen={() => setMenuFlyout("show")}
                styles={styles}
                chevronColor={theme.colors.foregroundMuted}
              />
              <View style={styles.menuSeparator} />
              <MenuSubTrigger
                label="Status"
                active={menuFlyout === "status"}
                onOpen={() => setMenuFlyout("status")}
                styles={styles}
                chevronColor={theme.colors.foregroundMuted}
              />
              <MenuSubTrigger
                label="Lifecycle"
                active={menuFlyout === "lifecycle"}
                onOpen={() => setMenuFlyout("lifecycle")}
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
                selectedId={flyoutSelectedId}
                selectedIds={flyoutSelectedIds}
                onSelect={selectMenuOption}
                styles={styles}
                checkColor={theme.colors.foregroundMuted}
                iconColor={theme.colors.foregroundMuted}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
