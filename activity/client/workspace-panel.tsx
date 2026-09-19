import {
  type PluginWorkspacePanelProps,
  usePaseo,
  useRpc,
  useWorkspace,
} from "@getpaseo/plugin/client";
import { Icon, useToast } from "@getpaseo/plugin/client/react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
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
  usageAgentUnarchiveRpc,
  usageAgentsRpc,
  usageMcpByToolRpc,
  usageSkillsByNameRpc,
  usageSummaryRpc,
} from "../shared/usage.ts";
import { formatDisplayName, formatLocalDateTime, formatUpdatedAt } from "../shared/format.ts";
import { RANGE_OPTIONS, rangeFrom, type RangeId } from "./range.ts";
import { useAppLanguage } from "./use-app-language.ts";
import { UsageStats } from "./usage-stats.tsx";

type AgentSort = "created" | "updated" | "name" | "messages" | "status";
type AgentGroup = "none" | "provider";
type AgentShowField = "provider" | "calls" | "messages" | "updated";
/** Archive scope: Active / Archived. */
type AgentStatusFilter = "active" | "archived";
/** Lifecycle for non-archived agents: Idle / Running / Error / Closed. */
type AgentLifecycleFilter = "idle" | "running" | "error" | "closed";
type MenuFlyout = "sort" | "group" | "show" | "status" | "lifecycle";

type AgentStatusInfo = {
  rank: number;
  updatedAt: string | null;
  status: string | null;
};

type MenuOption = { id: string; label: string; icon: string };

/** Host MenuFlyout overlap between root surface and submenu (`SUBMENU_OVERLAP`). */
const MENU_SUBMENU_OVERLAP = 5;
const MENU_WIDTH = 232;
const MENU_OPTION_ICON_SIZE = 14;
/** Approx list-row height (padding + title/meta) for stable Skills/MCP section size. */
const RANK_ROW_ESTIMATE = 54;

const SORT_OPTIONS: ReadonlyArray<MenuOption & { id: AgentSort }> = [
  { id: "created", label: "Created", icon: "CalendarPlus" },
  { id: "updated", label: "Updated", icon: "Clock" },
  { id: "name", label: "Name", icon: "Type" },
  { id: "messages", label: "Messages", icon: "MessageSquare" },
  { id: "status", label: "Status", icon: "CircleDashed" },
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

const GROUP_OPTIONS: ReadonlyArray<MenuOption & { id: AgentGroup }> = [
  { id: "none", label: "None", icon: "Minus" },
  { id: "provider", label: "Provider", icon: "Server" },
];

const SHOW_FIELD_OPTIONS: ReadonlyArray<MenuOption & { id: AgentShowField }> = [
  { id: "provider", label: "Provider", icon: "Server" },
  { id: "calls", label: "Calls", icon: "Terminal" },
  { id: "messages", label: "Messages", icon: "MessageSquare" },
  { id: "updated", label: "Updated", icon: "Clock" },
];

const STATUS_FILTER_OPTIONS: ReadonlyArray<MenuOption & { id: AgentStatusFilter }> = [
  { id: "active", label: "Active", icon: "CircleCheck" },
  { id: "archived", label: "Archived", icon: "Archive" },
];

const LIFECYCLE_FILTER_OPTIONS: ReadonlyArray<MenuOption & { id: AgentLifecycleFilter }> = [
  { id: "idle", label: "Idle", icon: "Circle" },
  { id: "running", label: "Running", icon: "Play" },
  { id: "error", label: "Error", icon: "CircleAlert" },
  { id: "closed", label: "Closed", icon: "CircleOff" },
];

/** Active on by default; archived is opt-in. */
const DEFAULT_STATUS_FILTERS: ReadonlySet<AgentStatusFilter> = new Set(["active"]);

/** All lifecycle statuses on by default. */
const DEFAULT_LIFECYCLE_FILTERS: ReadonlySet<AgentLifecycleFilter> = new Set([
  "idle",
  "running",
  "error",
  "closed",
]);

const DEFAULT_SHOW_FIELDS: ReadonlySet<AgentShowField> = new Set([
  "provider",
  "calls",
  "messages",
]);

function optionLabel<T extends string>(
  options: ReadonlyArray<{ id: T; label: string }>,
  id: T,
): string {
  return options.find((option) => option.id === id)?.label ?? id;
}

function matchesAgentFilters(
  item: AgentUsageItem,
  statusFilters: ReadonlySet<AgentStatusFilter>,
  lifecycleFilters: ReadonlySet<AgentLifecycleFilter>,
  byId: Record<string, AgentStatusInfo> | undefined,
): boolean {
  if (item.archivedAt != null) return statusFilters.has("archived");
  if (!statusFilters.has("active")) return false;
  if (lifecycleFilters.size === 0) return false;
  const status = byId?.[item.agentId]?.status;
  if (status === "idle" || status === "running" || status === "error" || status === "closed") {
    return lifecycleFilters.has(status);
  }
  // initializing / unknown: visible when Active is on and any lifecycle is selected
  return true;
}

function agentUpdatedAt(
  item: AgentUsageItem,
  byId: Record<string, AgentStatusInfo> | undefined,
): string | null {
  return item.updatedAt ?? byId?.[item.agentId]?.updatedAt ?? item.lastActivityAt ?? null;
}

function formatAgentMeta(
  item: AgentUsageItem,
  showFields: ReadonlySet<AgentShowField>,
  byId: Record<string, AgentStatusInfo> | undefined,
  locale: string,
): string | null {
  const parts: string[] = [];
  if (showFields.has("provider")) parts.push(providerLabel(item.provider));
  if (showFields.has("calls")) parts.push(`${item.callCount} calls`);
  if (showFields.has("messages")) parts.push(`${item.messageCount} messages`);
  if (showFields.has("updated")) {
    const at = agentUpdatedAt(item, byId);
    if (at) parts.push(formatUpdatedAt(at, locale));
  }
  if (parts.length === 0) return null;
  return parts.join(" · ");
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
  menuLeadingSlot: ViewStyle;
  menuSurface: ViewStyle;
  menuRootWrap: ViewStyle;
  menuFlyout: ViewStyle;
  menuSeparator: ViewStyle;
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
  selectedIds,
  onSelect,
  styles,
  checkColor,
  iconColor,
}: {
  options: ReadonlyArray<MenuOption>;
  selectedId?: string;
  selectedIds?: ReadonlySet<string>;
  onSelect: (id: string) => void;
  styles: MenuStyles;
  checkColor: string;
  iconColor: string;
}): ReactNode {
  return (
    <View style={styles.menuPage}>
      {options.map((option) => {
        const selected =
          selectedIds != null ? selectedIds.has(option.id) : selectedId === option.id;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onSelect(option.id)}
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.menuOption,
              pressed || hovered ? styles.menuRowHighlighted : null,
            ]}
          >
            <View style={styles.menuLeadingSlot}>
              <Icon name={option.icon} size={MENU_OPTION_ICON_SIZE} color={iconColor} />
            </View>
            <Text style={styles.menuOptionLabel} numberOfLines={1}>
              {option.label}
            </Text>
            {selected ? (
              <View style={styles.menuTrailing}>
                <Icon name="Check" size={16} color={checkColor} />
              </View>
            ) : null}
          </Pressable>
        );
      })}
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

type AgentRowStyles = {
  agentListRow: ViewStyle;
  listMain: ViewStyle;
  listLink: TextStyle;
  listTitle: TextStyle;
  listMeta: TextStyle;
  titleAction: ViewStyle;
};

function AgentRow({
  label,
  archived,
  canOpen,
  meta,
  busy,
  actionDisabled,
  theme,
  styles,
  onOpen,
  onArchiveToggle,
}: {
  label: string;
  archived: boolean;
  canOpen: boolean;
  meta: string | null;
  busy: boolean;
  actionDisabled: boolean;
  theme: PluginWorkspacePanelProps["theme"];
  styles: AgentRowStyles;
  onOpen: () => void;
  onArchiveToggle: () => void;
}): ReactNode {
  const [hovered, setHovered] = useState(false);
  // Web: hover-reveal. Native has no hover — keep the action visible.
  // Use mouseenter/leave on a View (not nested Pressable hover) so moving onto
  // the title link or action button does not flicker hovered off.
  const showAction = Platform.OS !== "web" || hovered || busy;
  return (
    <View
      style={styles.agentListRow}
      {...(Platform.OS === "web"
        ? ({
            onMouseEnter: () => setHovered(true),
            onMouseLeave: () => setHovered(false),
          } as object)
        : null)}
    >
      <Icon
        name={archived ? "BotOff" : "Bot"}
        size={18}
        color={theme.colors.foregroundMuted}
      />
      <View style={styles.listMain}>
        {canOpen ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Open conversation ${label}`}
            onPress={onOpen}
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
        {meta ? (
          <Text style={styles.listMeta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={archived ? `Unarchive ${label}` : `Archive ${label}`}
        accessibilityState={{ disabled: actionDisabled }}
        disabled={actionDisabled || !showAction}
        hitSlop={8}
        onPress={onArchiveToggle}
        pointerEvents={showAction ? "auto" : "none"}
        style={[styles.titleAction, { opacity: showAction ? 1 : 0 }]}
      >
        {busy ? (
          <ActivityIndicator size="small" color={theme.colors.foregroundMuted} />
        ) : (
          <Icon
            name={archived ? "ArchiveRestore" : "Archive"}
            size={14}
            color={theme.colors.foregroundMuted}
          />
        )}
      </Pressable>
    </View>
  );
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
  const [agentShowFields, setAgentShowFields] = useState<ReadonlySet<AgentShowField>>(
    () => new Set(DEFAULT_SHOW_FIELDS),
  );
  const [agentStatusFilters, setAgentStatusFilters] = useState<ReadonlySet<AgentStatusFilter>>(
    () => new Set(DEFAULT_STATUS_FILTERS),
  );
  const [agentLifecycleFilters, setAgentLifecycleFilters] = useState<
    ReadonlySet<AgentLifecycleFilter>
  >(() => new Set(DEFAULT_LIFECYCLE_FILTERS));
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuFlyout, setMenuFlyout] = useState<MenuFlyout | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; right: number } | null>(null);
  const rootRef = useRef<View>(null);
  const triggerRef = useRef<View>(null);
  const [rankKind, setRankKind] = useState<RankKind>("skills");
  const [busyAgentId, setBusyAgentId] = useState<string | null>(null);
  const padding = layout.compact ? 16 : 24;
  const locale = useAppLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();
  const workspaceName = useWorkspace(workspaceId, (workspace) => workspace.title ?? workspace.name);
  const openAgent = navigation?.openAgent;
  const from = rangeFrom(range);
  const window = from ? { from } : {};

  const summaryRpc = useRpc(usageSummaryRpc);
  const agentsRpc = useRpc(usageAgentsRpc);
  const unarchiveAgentRpc = useRpc(usageAgentUnarchiveRpc);
  const skillsRpc = useRpc(usageSkillsByNameRpc);
  const mcpRpc = useRpc(usageMcpByToolRpc);

  const agentsQueryKey = ["activity", "workspace-agents", workspaceId, from ?? "all"] as const;

  const summary = useQuery({
    refetchInterval: 15_000,
    retry: false,
    queryKey: ["activity", "workspace-summary", workspaceId, from ?? "all"],
    queryFn: () => summaryRpc({ workspaceId, ...window }),
  });

  const agents = useQuery({
    refetchInterval: 15_000,
    retry: false,
    queryKey: agentsQueryKey,
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
          status: agent.status ?? null,
        };
      }
      return map;
    },
  });

  const agentItems = agents.data?.items ?? [];
  const visibleAgentItems = useMemo(() => {
    const byId = statuses.data;
    const filtered = agentItems.filter((item) =>
      matchesAgentFilters(item, agentStatusFilters, agentLifecycleFilters, byId),
    );
    const byName = (a: AgentUsageItem, b: AgentUsageItem) =>
      (a.title ?? a.agentId).localeCompare(b.title ?? b.agentId);
    const updatedAt = (item: AgentUsageItem) => agentUpdatedAt(item, byId) ?? "";
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
  }, [agentItems, agentStatusFilters, agentLifecycleFilters, agentSort, statuses.data]);

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
      // Outer shell stays overflow-visible so the fixed/absolute menu is not clipped;
      // inner screen clips list reflows so Explorer scrollWidth stays stable.
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
        // Always hide scrollbar so show/hide never shifts Explorer width.
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
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        gap: 8,
      },
      titleAction: {
        width: 24,
        height: 24,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        borderRadius: 6,
        flexShrink: 0,
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
      agentListRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 10,
        paddingVertical: 6,
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
        // Fixed on web so click-outside covers the viewport without expanding Explorer.
        position: (Platform.OS === "web" ? "fixed" : "absolute") as "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 30,
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
        // Fixed on web: left flyout must not contribute to Explorer scrollWidth.
        position: (Platform.OS === "web" ? "fixed" : "absolute") as "absolute",
        zIndex: 31,
        overflow: "visible" as const,
      },
      // Sibling flyout to the left of the root (menu is end-aligned; host opens right into content).
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
      // Web: viewport-fixed menu so the left flyout cannot widen Explorer scrollWidth.
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
      setAgentSort(id as AgentSort);
      closeMenu();
      return;
    }
    if (menuFlyout === "group") {
      setAgentGroup(id as AgentGroup);
      closeMenu();
      return;
    }
    if (menuFlyout === "status") {
      const status = id as AgentStatusFilter;
      setAgentStatusFilters((prev) => {
        const next = new Set(prev);
        if (next.has(status)) next.delete(status);
        else next.add(status);
        return next;
      });
      return;
    }
    if (menuFlyout === "lifecycle") {
      const lifecycle = id as AgentLifecycleFilter;
      setAgentLifecycleFilters((prev) => {
        const next = new Set(prev);
        if (next.has(lifecycle)) next.delete(lifecycle);
        else next.add(lifecycle);
        return next;
      });
      return;
    }
    if (menuFlyout === "show") {
      const field = id as AgentShowField;
      setAgentShowFields((prev) => {
        const next = new Set(prev);
        if (next.has(field)) next.delete(field);
        else next.add(field);
        return next;
      });
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
    } catch (error) {
      patchAgentArchivedAt(item.agentId, previous);
      toast.error(error instanceof Error ? error.message : String(error));
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
    } catch (error) {
      patchAgentArchivedAt(item.agentId, previous);
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusyAgentId(null);
    }
  }

  function renderAgentRow(item: AgentUsageItem): ReactNode {
    const label = item.title ?? item.agentId;
    const archived = item.archivedAt != null;
    const canOpen = openAgent != null && !archived;
    const meta = formatAgentMeta(item, agentShowFields, statuses.data, locale);
    const busy = busyAgentId === item.agentId;
    return (
      <AgentRow
        key={item.agentId}
        label={label}
        archived={archived}
        canOpen={canOpen}
        meta={meta}
        busy={busy}
        actionDisabled={busy || busyAgentId != null}
        theme={theme}
        styles={styles}
        onOpen={() => openAgent?.({ agentId: item.agentId })}
        onArchiveToggle={() => {
          void (archived ? unarchiveAgent(item) : archiveAgent(item));
        }}
      />
    );
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
                <View ref={triggerRef} collapsable={false}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Agent display options"
                    accessibilityState={{ expanded: menuOpen }}
                    hitSlop={8}
                    onPress={() => {
                      if (menuOpen) closeMenu();
                      else openMenu();
                    }}
                    style={styles.titleAction}
                  >
                    <Icon name="Settings2" size={14} color={theme.colors.foregroundMuted} />
                  </Pressable>
                </View>
              </View>
            </View>
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
                  {agentStatusFilters.size === 0 || agentLifecycleFilters.size === 0
                    ? "No filters selected"
                    : "No matching agents"}
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
            <View
              style={[
                styles.panel,
                {
                  minHeight:
                    Math.max(skillItems.length, mcpItems.length, 1) * RANK_ROW_ESTIMATE,
                },
              ]}
            >
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
