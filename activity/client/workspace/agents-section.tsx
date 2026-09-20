import { Icon, TextInput } from "@getpaseo/plugin/client/react-native";
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  Animated,
  Easing,
  Pressable,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { providerLabel, type AgentUsageItem } from "../../shared/usage.ts";
import { useLatestUserMessagePreview } from "../use-latest-user-message.ts";
import { AgentRow, type AgentRowStyles } from "./agent-row.tsx";
import {
  AGENT_PAGE_SIZE,
  attentionKind,
  countSubAgentsByParent,
  isAgentRunning,
  SEARCH_ANIM_MS,
  SEARCH_TITLE_GAP,
  type AgentGroup,
  type AgentShowField,
  type AgentStatusFilter,
  type AgentStatusInfo,
} from "./constants.ts";
import { formatAgentMeta } from "./filters.ts";
import type { WorkspaceTheme } from "./constants.ts";

export type AgentsSectionStyles = AgentRowStyles & {
  agentsSection: ViewStyle;
  agentsHeaderWrap: ViewStyle;
  agentsHeaderRow: ViewStyle;
  agentsHeaderSearchSlot: ViewStyle;
  searchField: ViewStyle;
  searchInput: TextStyle;
  headerActions: ViewStyle;
  sectionTitle: TextStyle;
  titleAction: ViewStyle;
  panel: ViewStyle;
  agentGroup: ViewStyle;
  groupLabel: TextStyle;
  empty: TextStyle;
  pagerRow: ViewStyle;
  pagerButton: ViewStyle;
  pagerButtonDisabled: ViewStyle;
  pagerLabel: TextStyle;
};

function WorkspaceAgentRow({
  item,
  theme,
  styles,
  locale,
  agentShowFields,
  statuses,
  subAgentCount,
  busyAgentId,
  openAgent,
  onArchive,
  onUnarchive,
}: {
  item: AgentUsageItem;
  theme: WorkspaceTheme;
  styles: AgentsSectionStyles;
  locale: string;
  agentShowFields: ReadonlySet<AgentShowField>;
  statuses: Record<string, AgentStatusInfo> | undefined;
  subAgentCount: number;
  busyAgentId: string | null;
  openAgent?: (opts: { agentId: string }) => void;
  onArchive: (item: AgentUsageItem) => void;
  onUnarchive: (item: AgentUsageItem) => void;
}): ReactNode {
  const showPrompt = agentShowFields.has("prompt");
  const preview = useLatestUserMessagePreview(item.agentId, showPrompt);
  useEffect(() => {
    if (!showPrompt || !preview.isError) return;
    console.warn("[activity] latest user message preview failed", item.agentId, preview.error);
  }, [showPrompt, preview.isError, preview.error, item.agentId]);

  const promptPreview = showPrompt
    ? (preview.data ?? (preview.isLoading ? "…" : null))
    : null;
  const label = item.title ?? item.agentId;
  const archived = item.archivedAt != null;
  const canOpen = openAgent != null && !archived;
  const meta = formatAgentMeta(item, agentShowFields, statuses, locale, promptPreview);
  const statusInfo = statuses?.[item.agentId];
  const permissionCount = statusInfo?.permissionCount ?? 0;
  const busy = busyAgentId === item.agentId;

  return (
    <AgentRow
      label={label}
      archived={archived}
      canOpen={canOpen}
      meta={meta}
      permissionCount={permissionCount}
      attentionKind={attentionKind(statusInfo)}
      running={isAgentRunning(statusInfo)}
      subAgentCount={subAgentCount}
      busy={busy}
      actionDisabled={busy || busyAgentId != null}
      theme={theme}
      styles={styles}
      onOpen={() => openAgent?.({ agentId: item.agentId })}
      onArchiveToggle={() => {
        if (archived) onUnarchive(item);
        else onArchive(item);
      }}
    />
  );
}

export function AgentsSection({
  theme,
  styles,
  locale,
  agentGroup,
  agentShowFields,
  statuses,
  agentItems,
  visibleAgentItems,
  statusFilters,
  statusFiltersEmpty,
  busyAgentId,
  openAgent,
  menuOpen,
  onToggleMenu,
  triggerRef,
  searchQuery,
  onSearchQueryChange,
  onArchive,
  onUnarchive,
  resetKey,
}: {
  theme: WorkspaceTheme;
  styles: AgentsSectionStyles;
  locale: string;
  agentGroup: AgentGroup;
  agentShowFields: ReadonlySet<AgentShowField>;
  statuses: Record<string, AgentStatusInfo> | undefined;
  /** Full workspace registry list (unfiltered) — source for subagent counts (041). */
  agentItems: ReadonlyArray<AgentUsageItem>;
  /** Already filtered / sorted / search-matched. */
  visibleAgentItems: ReadonlyArray<AgentUsageItem>;
  /** Status menu Active / Archived — scopes subagent badge counts. */
  statusFilters: ReadonlySet<AgentStatusFilter>;
  statusFiltersEmpty: boolean;
  busyAgentId: string | null;
  openAgent?: (opts: { agentId: string }) => void;
  menuOpen: boolean;
  onToggleMenu: () => void;
  triggerRef: RefObject<View | null>;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onArchive: (item: AgentUsageItem) => void;
  onUnarchive: (item: AgentUsageItem) => void;
  /** Bump when workspace changes to collapse search. */
  resetKey: string;
}): ReactNode {
  const [agentSearchOpen, setAgentSearchOpen] = useState(false);
  const [searchSlotWidth, setSearchSlotWidth] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const searchProgress = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<{ focus?: () => void } | null>(null);

  useEffect(() => {
    searchProgress.stopAnimation();
    searchProgress.setValue(0);
    setAgentSearchOpen(false);
    setPageIndex(0);
  }, [resetKey, searchProgress]);

  useEffect(() => {
    if (!agentSearchOpen) return;
    const id = setTimeout(() => searchInputRef.current?.focus?.(), SEARCH_ANIM_MS);
    return () => clearTimeout(id);
  }, [agentSearchOpen]);

  useEffect(() => {
    setPageIndex(0);
  }, [visibleAgentItems]);

  function openAgentSearch() {
    if (agentSearchOpen) return;
    setAgentSearchOpen(true);
    Animated.timing(searchProgress, {
      toValue: 1,
      duration: SEARCH_ANIM_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }

  function closeAgentSearch() {
    if (!agentSearchOpen) return;
    Animated.timing(searchProgress, {
      toValue: 0,
      duration: SEARCH_ANIM_MS,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) return;
      setAgentSearchOpen(false);
      onSearchQueryChange("");
    });
  }

  const pageCount = Math.max(1, Math.ceil(visibleAgentItems.length / AGENT_PAGE_SIZE));
  const safePage = Math.min(pageIndex, pageCount - 1);
  const pageItems = useMemo(() => {
    const start = safePage * AGENT_PAGE_SIZE;
    return visibleAgentItems.slice(start, start + AGENT_PAGE_SIZE);
  }, [visibleAgentItems, safePage]);

  const pageGroups = useMemo(() => {
    if (agentGroup === "none") return null;
    if (agentGroup === "status") {
      const active: AgentUsageItem[] = [];
      const archived: AgentUsageItem[] = [];
      for (const item of pageItems) {
        if (item.archivedAt != null) archived.push(item);
        else active.push(item);
      }
      const groups: Array<[string, AgentUsageItem[]]> = [];
      if (active.length > 0) groups.push(["Active", active]);
      if (archived.length > 0) groups.push(["Archived", archived]);
      return groups;
    }
    const map = new Map<string, AgentUsageItem[]>();
    for (const item of pageItems) {
      const list = map.get(item.provider);
      if (list) list.push(item);
      else map.set(item.provider, [item]);
    }
    return [...map.entries()].sort((a, b) =>
      providerLabel(a[0]).localeCompare(providerLabel(b[0])),
    );
  }, [agentGroup, pageItems]);

  const subAgentCounts = useMemo(
    () => countSubAgentsByParent(agentItems, statusFilters),
    [agentItems, statusFilters],
  );

  function renderAgentRow(item: AgentUsageItem): ReactNode {
    return (
      <WorkspaceAgentRow
        key={item.agentId}
        item={item}
        theme={theme}
        styles={styles}
        locale={locale}
        agentShowFields={agentShowFields}
        statuses={statuses}
        subAgentCount={subAgentCounts[item.agentId] ?? 0}
        busyAgentId={busyAgentId}
        openAgent={openAgent}
        onArchive={onArchive}
        onUnarchive={onUnarchive}
      />
    );
  }

  const showPager = pageCount > 1;

  return (
    <View style={styles.agentsSection}>
      <View style={styles.agentsHeaderWrap}>
        <View style={styles.agentsHeaderRow}>
          <Text style={styles.sectionTitle}>Agents</Text>
          <View
            style={styles.agentsHeaderSearchSlot}
            onLayout={(event) => {
              const next = event.nativeEvent.layout.width;
              setSearchSlotWidth((prev) => (prev === next ? prev : next));
            }}
          >
            <Animated.View
              pointerEvents={agentSearchOpen ? "auto" : "none"}
              style={[
                styles.searchField,
                {
                  width: searchProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, Math.max(0, searchSlotWidth - SEARCH_TITLE_GAP)],
                  }),
                  opacity: searchProgress,
                  marginLeft: searchProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, SEARCH_TITLE_GAP],
                  }),
                },
              ]}
            >
              <Icon name="Search" size={14} color={theme.colors.foregroundMuted} />
              <TextInput
                ref={searchInputRef as never}
                value={searchQuery}
                onChangeText={onSearchQueryChange}
                placeholder="Search agents"
                placeholderTextColor={theme.colors.foregroundMuted}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                editable={agentSearchOpen}
                style={styles.searchInput}
                accessibilityLabel="Search agents by title"
              />
            </Animated.View>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={agentSearchOpen ? "Close agent search" : "Search agents"}
              accessibilityState={{ expanded: agentSearchOpen }}
              hitSlop={8}
              onPress={() => {
                if (agentSearchOpen) closeAgentSearch();
                else openAgentSearch();
              }}
              style={styles.titleAction}
            >
              <Icon
                name={agentSearchOpen ? "X" : "Search"}
                size={14}
                color={theme.colors.foregroundMuted}
              />
            </Pressable>
            <View ref={triggerRef} collapsable={false}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Agent display options"
                accessibilityState={{ expanded: menuOpen }}
                hitSlop={8}
                onPress={onToggleMenu}
                style={styles.titleAction}
              >
                <Icon name="Settings2" size={14} color={theme.colors.foregroundMuted} />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.panel}>
        {pageGroups
          ? pageGroups.map(([groupKey, items]) => (
              <View key={groupKey} style={styles.agentGroup}>
                <Text style={styles.groupLabel}>
                  {agentGroup === "provider" ? providerLabel(groupKey) : groupKey}
                </Text>
                {items.map(renderAgentRow)}
              </View>
            ))
          : pageItems.map(renderAgentRow)}
        {visibleAgentItems.length === 0 ? (
          <Text style={styles.empty}>
            {statusFiltersEmpty ? "No filters selected" : "No matching agents"}
          </Text>
        ) : null}
        {showPager ? (
          <View style={styles.pagerRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous agents page"
              accessibilityState={{ disabled: safePage === 0 }}
              disabled={safePage === 0}
              hitSlop={8}
              onPress={() => setPageIndex((p) => Math.max(0, p - 1))}
              style={[styles.pagerButton, safePage === 0 ? styles.pagerButtonDisabled : null]}
            >
              <Icon name="ChevronLeft" size={14} color={theme.colors.foregroundMuted} />
            </Pressable>
            <Text style={styles.pagerLabel}>
              {safePage + 1} / {pageCount}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next agents page"
              accessibilityState={{ disabled: safePage >= pageCount - 1 }}
              disabled={safePage >= pageCount - 1}
              hitSlop={8}
              onPress={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
              style={[
                styles.pagerButton,
                safePage >= pageCount - 1 ? styles.pagerButtonDisabled : null,
              ]}
            >
              <Icon name="ChevronRight" size={14} color={theme.colors.foregroundMuted} />
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}
