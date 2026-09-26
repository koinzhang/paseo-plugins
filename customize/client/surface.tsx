import { type PluginSurfaceProps, usePaseo, useRpc, useSettings } from "@getpaseo/plugin/client";
import { Icon, ScrollView, TextInput } from "@getpaseo/plugin/client/react-native";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform, Text, View } from "react-native";
import { resolveCategory, visibleCategories } from "../shared/category-visibility.ts";
import { cachedScanRpc, scanRpc, type Category, type Entry } from "../shared/contracts.ts";
import { messagesFor } from "../shared/i18n.ts";
import { MECHANISMS, mechanismFor } from "../shared/mechanisms.ts";
import { type ProviderId } from "../shared/providers.ts";
import { selectionSettings } from "../shared/selection-settings.ts";
import { CONTROL, ICON_SIZE, PREVIEW_FRACTION, RADIUS, TEXT, pageLayout, titleGap } from "./design-tokens.ts";
import { Dropdown, type DropdownOption } from "./dropdown.tsx";
import { countByCategory, countSkillInvocation, groupEntries, matchesSkillInvocation, projectLabel, SKILL_INVOCATION_FILTERS, type SkillInvocationFilter } from "./entries.ts";
import { EntryRow } from "./entry-row.tsx";
import { MechanismCard } from "./mechanism-card.tsx";
import { PreviewPane } from "./preview-pane.tsx";
import { enabledProviderOptions, selectedProvider } from "./provider-options.ts";
import { newestScan, REVISIT_QUERY_POLICY, SCAN_QUERY_POLICY, shouldScanSnapshot } from "./query-policy.ts";
import { CategoryTabs, ErrorState, IconButton, InlineEmpty, LoadingState, SectionHeader, SegmentedControl } from "./ui.tsx";
import { useAppLanguage } from "./use-app-language.ts";
import { readLastWorkspaceId } from "./web.ts";

const NO_PROJECT = "";
const WORKSPACE_PAGE_LIMIT = 200;

/** Sidebar surface; an unselected project defaults to the last workspace. */
export function CustomizeSurface({ theme, layout }: PluginSurfaceProps): ReactNode {
  const colors = theme.colors;
  const compact = layout.compact;
  const page = pageLayout(compact);
  const language = useAppLanguage();
  const m = messagesFor(language);
  const paseo = usePaseo();
  const scan = useRpc(scanRpc);
  const cachedScan = useRpc(cachedScanRpc);
  const settings = useSettings(selectionSettings);
  const providerSnapshot = useQuery({
    queryKey: ["customize", "providers"],
    queryFn: () => paseo.providers.snapshot(),
    staleTime: 15_000,
    ...REVISIT_QUERY_POLICY,
    refetchInterval: 30_000,
  });
  const providerOptions = useMemo(() => enabledProviderOptions(
    [
      ...(providerSnapshot.data?.entries ?? []),
      ...(providerSnapshot.data?.compactSnapshot?.entries ?? []),
    ],
    m.builtinProvider,
  ), [providerSnapshot.data, m.builtinProvider]);
  const [workspaceId] = useState(() => (Platform.OS === "web" ? readLastWorkspaceId() : null));
  const lastWorkspace = useQuery({
    queryKey: ["customize", "workspace-root", workspaceId],
    enabled: workspaceId !== null,
    staleTime: 60_000,
    ...REVISIT_QUERY_POLICY,
    queryFn: async () => {
      let page = await paseo.workspaces.list({ page: { limit: WORKSPACE_PAGE_LIMIT } });
      for (let pages = 0; ; pages++) {
        const hit = page.entries.find((workspace) => workspace.id === workspaceId);
        if (hit) return hit.projectRootPath;
        if (!page.pageInfo.hasMore || !page.pageInfo.nextCursor || pages >= 20) return null;
        page = await paseo.workspaces.list({ page: { limit: WORKSPACE_PAGE_LIMIT, cursor: page.pageInfo.nextCursor } });
      }
    },
  });
  const workspaceRoot = lastWorkspace.data ?? null;

  const savedProvider = settings.status === "ready" ? settings.values.provider : "claude";
  const effectiveProvider = selectedProvider(savedProvider, providerOptions);
  const provider = effectiveProvider ?? "claude";
  const projectChoice = settings.status === "ready" ? settings.values.projectRoot : null;
  const [category, setCategoryState] = useState<Category>("instructions");
  const activeCategory = resolveCategory(provider, category);
  const [query, setQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState<SkillInvocationFilter>("all");
  const [selected, setSelected] = useState<Entry | null>(null);

  const setProvider = (id: string) => {
    if (settings.status !== "ready" || settings.saving || !providerOptions.some((option) => option.id === id)) return;
    void settings.save({ ...settings.values, provider: id as ProviderId }, settings.revision);
    setSelected(null);
  };
  const setCategory = (next: Category) => {
    setCategoryState(next);
    setSelected(null);
  };

  useEffect(() => {
    setCategoryState((current) => resolveCategory(provider, current));
    setSelected(null);
    setQuery("");
  }, [provider]);

  const projects = useQuery({
    queryKey: ["customize", "projects"],
    queryFn: () => paseo.projects.list(),
    staleTime: 60_000,
    ...REVISIT_QUERY_POLICY,
  });

  const projectOptions = useMemo<DropdownOption[]>(() => {
    const options = new Map<string, DropdownOption>();
    const add = (root: string, label?: string) => {
      if (root && !options.has(root)) options.set(root, { id: root, label: label || projectLabel(root), hint: root });
    };
    if (workspaceRoot) add(workspaceRoot);
    for (const project of projects.data?.projects ?? []) add(project.projectRootPath, project.projectDisplayName);
    if (projectChoice) add(projectChoice);
    return [...options.values(), { id: NO_PROJECT, label: m.noProject }];
  }, [workspaceRoot, projects.data, projectChoice, m.noProject]);
  const projectRoot = projectChoice ?? workspaceRoot ?? (projects.isPending || (workspaceId !== null && lastWorkspace.isPending) ? null : projectOptions[0]?.id ?? NO_PROJECT);

  const scanEnabled = settings.status === "ready" && providerSnapshot.data !== undefined && effectiveProvider !== null && projectRoot !== null;
  const saved = useQuery({
    queryKey: ["customize", "cached-scan", provider, projectRoot],
    queryFn: () => cachedScan({ provider, projectRoot: projectRoot || null }),
    enabled: scanEnabled,
    ...REVISIT_QUERY_POLICY,
  });
  const result = useQuery({
    queryKey: ["customize", "scan", provider, projectRoot],
    queryFn: () => scan({ provider, projectRoot: projectRoot || null }),
    enabled: scanEnabled && shouldScanSnapshot(saved.data, saved.isFetching, saved.isError),
    ...SCAN_QUERY_POLICY,
  });
  const displayed = newestScan(saved.data?.snapshot, result.data);
  const entries = displayed?.entries ?? [];
  const counts = useMemo(() => countByCategory(entries), [entries]);
  const skillCounts = useMemo(() => countSkillInvocation(entries), [entries]);
  const groups = useMemo(
    () => groupEntries(entries, activeCategory, query, skillFilter),
    [entries, activeCategory, query, skillFilter],
  );
  const mechanism = mechanismFor(provider, activeCategory, displayed?.compatibility);
  const compatibility = displayed?.compatibility;
  const compatibilityState = compatibility?.source === "builtIn" ? "supported"
    : compatibility?.enabled === true ? "on" : compatibility?.enabled === false ? "off" : "unknown";

  useEffect(() => {
    if (!selected || !displayed) return;
    const fresh = displayed.entries.find((entry) => entry.id === selected.id);
    if (fresh !== selected) setSelected(fresh ?? null);
  }, [displayed, selected]);

  useEffect(() => {
    if (!selected || selected.category !== "skills" || matchesSkillInvocation(selected, skillFilter)) return;
    setSelected(null);
  }, [selected, skillFilter]);

  const onSelect = useCallback((entry: Entry) => {
    setSelected((prev) => (prev?.id === entry.id ? null : entry));
  }, []);

  const tabs = visibleCategories(provider).map((id) => ({
    id,
    label: m.categories[id],
    count: displayed ? counts[id] : undefined,
    muted: !MECHANISMS[provider][id].supported,
  }));
  const queryActive = query.trim().length > 0;
  const listNarrowed = queryActive || (activeCategory === "skills" && skillFilter !== "all");
  const skillFilterOptions = SKILL_INVOCATION_FILTERS.map((id) => ({
    id,
    label: m.skillFilters[id],
    count: displayed ? skillCounts[id] : undefined,
  }));

  if (settings.status === "loading") return <LoadingState color={colors.foregroundMuted} />;
  if (settings.status !== "ready") {
    return <ErrorState error={settings.error} onRetry={() => void settings.reload()} colors={colors} />;
  }
  if (providerSnapshot.isPending) return <LoadingState color={colors.foregroundMuted} />;
  if (providerSnapshot.isError && !providerSnapshot.data) {
    return <ErrorState error={providerSnapshot.error} onRetry={() => void providerSnapshot.refetch()} colors={colors} />;
  }
  if (effectiveProvider === null) {
    return (
      <View style={{ flex: 1, padding: page.padding, backgroundColor: colors.surface0, gap: page.gap }}>
        <Text style={{ ...TEXT.body, color: colors.foregroundMuted }}>{m.noEnabledProvider}</Text>
        <IconButton icon="RefreshCw" label={m.refresh} color={colors.foregroundMuted} busy={providerSnapshot.isFetching} onPress={() => void providerSnapshot.refetch()} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, minHeight: 0, backgroundColor: colors.surface0 }}>
      <View style={{ flex: selected ? 1 - (compact ? PREVIEW_FRACTION.compact : PREVIEW_FRACTION.regular) : 1, minHeight: 0 }}>
        <ScrollView contentContainerStyle={{ padding: page.padding, gap: page.gap }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: titleGap(compact), zIndex: 1 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "flex-end",
                zIndex: 30,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14, flexShrink: 1, minWidth: 0 }}>
                {compatibility ? (
                  <View accessible accessibilityRole="image" accessibilityLabel={m.compatibility(compatibilityState)}>
                    <Icon name={compatibilityState === "off" ? "Link2Off" : "Link2"} size={ICON_SIZE.action} color={compatibilityState === "on" || compatibilityState === "supported" ? colors.statusSuccess : compatibilityState === "off" ? colors.foregroundMuted : colors.statusWarning} />
                  </View>
                ) : null}
                <Dropdown
                  label={m.provider}
                  options={providerOptions}
                  value={provider}
                  onChange={setProvider}
                  colors={colors}
                  triggerLabel={m.chooseProvider}
                  closeLabel={m.closeMenu}
                  menuAlign={compact ? "left" : "right"}
                  disabled={settings.saving}
                />
                <Dropdown
                  label={m.project}
                  options={projectOptions}
                  value={projectRoot ?? NO_PROJECT}
                  onChange={(id) => {
                    if (settings.saving) return;
                    void settings.save({ ...settings.values, projectRoot: id }, settings.revision);
                    setSelected(null);
                  }}
                  colors={colors}
                  triggerLabel={m.chooseProject}
                  closeLabel={m.closeMenu}
                  emptyLabel={m.noProject}
                  disabled={settings.saving}
                />
                <IconButton
                  icon="RefreshCw"
                  label={m.refresh}
                  color={colors.foregroundMuted}
                  busy={result.isFetching}
                  tooltip={displayed ? {
                    text: m.lastScanned(new Date(displayed.scannedAt).toLocaleString(language)),
                    colors,
                  } : undefined}
                  onPress={() => {
                    void providerSnapshot.refetch();
                    void result.refetch();
                  }}
                />
              </View>
            </View>
            <CategoryTabs options={tabs} value={activeCategory} onChange={setCategory} colors={colors} />
            {settings.saveError ? <Text style={{ ...TEXT.small, color: colors.statusDanger }}>{settings.saveError}</Text> : null}
            <MechanismCard key={`${provider}:${activeCategory}`} mechanism={mechanism} language={language} colors={colors} m={m} />
            {result.isError && displayed ? <ErrorState error={result.error} onRetry={() => void result.refetch()} colors={colors} /> : null}
          </View>

          {mechanism.supported ? (
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <View
                style={{
                  flexGrow: 1,
                  flexBasis: 180,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  height: CONTROL.searchHeight,
                  paddingHorizontal: 10,
                  borderRadius: RADIUS.control,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface1,
                }}
              >
                <Icon name="Search" size={ICON_SIZE.inline} color={colors.foregroundMuted} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder={m.search}
                  placeholderTextColor={colors.foregroundMuted}
                  accessibilityLabel={m.search}
                  autoCorrect={false}
                  autoCapitalize="none"
                  style={{ flex: 1, ...TEXT.small, color: colors.foreground, paddingVertical: 0 }}
                />
                {queryActive ? <IconButton icon="X" label={m.preview.close} color={colors.foregroundMuted} size={ICON_SIZE.inline} onPress={() => setQuery("")} /> : null}
              </View>
              {activeCategory === "skills" ? (
                <SegmentedControl
                  label={m.skillInvocation}
                  options={skillFilterOptions}
                  value={skillFilter}
                  onChange={setSkillFilter}
                  colors={colors}
                />
              ) : null}
            </View>
          ) : null}

          {!displayed && (saved.isPending || result.isPending) ? (
            <LoadingState color={colors.foregroundMuted} />
          ) : !displayed && (result.isError || saved.isError) ? (
            <ErrorState error={result.error ?? saved.error} onRetry={() => void result.refetch()} colors={colors} />
          ) : !mechanism.supported ? null : (
            groups.map((group) => (
              <View key={group.scope} style={{ gap: titleGap(compact) }}>
                <SectionHeader
                  title={m.scopes[group.scope]}
                  count={group.count}
                  colors={colors}
                  compact={compact}
                />
                {group.count === 0 ? (
                  <InlineEmpty
                    text={listNarrowed ? m.noMatches : group.scope === "project" && !projectRoot ? m.noProject : m.emptyScope(m.scopes[group.scope])}
                    color={colors.foregroundMuted}
                  />
                ) : (
                  group.sources.map((source) => (
                    <View key={source.source} style={{ gap: 2 }}>
                      <Text style={{ ...TEXT.path, color: colors.foregroundMuted, paddingBottom: 2 }} numberOfLines={1}>
                        {source.source}
                      </Text>
                      {source.entries.map((entry) => (
                        <EntryRow
                          key={entry.id}
                          entry={entry}
                          selected={selected?.id === entry.id}
                          onSelect={onSelect}
                          colors={colors}
                          m={m}
                        />
                      ))}
                    </View>
                  ))
                )}
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {selected ? (
        <View
          style={{
            flex: compact ? PREVIEW_FRACTION.compact : PREVIEW_FRACTION.regular,
            minHeight: 0,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.surface0,
          }}
        >
          <PreviewPane entry={selected} onClose={() => setSelected(null)} colors={colors} compact={compact} m={m} />
        </View>
      ) : null}
    </View>
  );
}
