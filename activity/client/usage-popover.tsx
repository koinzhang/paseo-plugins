import {
  type PluginButtonContentProps,
  useRpc,
} from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import {
  usageReadSkillRpc,
} from "../shared/usage.ts";
import { formatDayTime, formatDisplayName } from "../shared/format.ts";
import { useUsagePillData } from "./usage-query.tsx";

const MONO = Platform.select({ ios: "Menlo", default: "monospace" });

export type SkillDetail = { skillName: string; path: string };

export type UsagePopoverProps = PluginButtonContentProps & {
  /** Open this SKILL.md in the agent Usage workspace panel (Skills-plugin pattern). */
  openSkillInPanel?: (skill: SkillDetail) => void;
};

function CountBadge({
  value,
  styles,
}: {
  value: number | string;
  styles: { countBadge: ViewStyle; countText: TextStyle };
}): ReactNode {
  return (
    <View style={styles.countBadge}>
      <Text style={styles.countText}>{value}</Text>
    </View>
  );
}

/**
 * Composer-pill popover body. Host owns anchoring / sheet chrome / outer scroll;
 * render content only.
 */
export function UsagePopover(props: UsagePopoverProps) {
  if (props.context !== "agent") {
    return (
      <Text style={{ color: props.theme.colors.foregroundMuted }}>
        Activity is only available for an agent
      </Text>
    );
  }
  return <UsagePopoverAgent {...props} context="agent" />;
}

function UsagePopoverAgent(
  props: UsagePopoverProps & { context: "agent" },
) {
  const { theme, layout, agentId, openSkillInPanel, close } = props;
  const [tab, setTab] = useState<"skills" | "mcp" | null>(null);
  const [skillDetail, setSkillDetail] = useState<SkillDetail | null>(null);
  const compact = layout.compact;

  const usage = useUsagePillData(agentId);
  const readSkillRpc = useRpc(usageReadSkillRpc);

  const skillFile = useQuery({
    queryKey: ["activity", "read-skill", skillDetail?.path ?? ""],
    queryFn: () => readSkillRpc({ path: skillDetail!.path }),
    enabled: Boolean(skillDetail?.path),
    retry: false,
  });

  const skillItems = useMemo(() => {
    return (usage.data?.skills ?? [])
      .filter((item) => item.total > 0)
      .slice()
      .sort((a, b) => {
        const ta = a.lastUsedAt ?? "";
        const tb = b.lastUsedAt ?? "";
        return tb.localeCompare(ta) || a.skillName.localeCompare(b.skillName);
      });
  }, [usage.data?.skills]);
  const mcpItems = useMemo(() => {
    return (usage.data?.mcpTools ?? []).slice().sort((a, b) => {
      const ta = a.lastUsedAt ?? "";
      const tb = b.lastUsedAt ?? "";
      return (
        tb.localeCompare(ta) ||
        a.server.localeCompare(b.server) ||
        a.tool.localeCompare(b.tool)
      );
    });
  }, [usage.data?.mcpTools]);

  useEffect(() => {
    if (skillItems.length > 0) setTab((t) => t ?? "skills");
    else if (mcpItems.length > 0) setTab("mcp");
    else setTab(null);
  }, [skillItems.length, mcpItems.length]);

  const styles = useMemo(
    () => ({
      root: {
        gap: 16,
        minWidth: compact ? undefined : 300,
        maxWidth: compact ? undefined : 380,
      },
      tabRow: {
        flexDirection: "row" as const,
        flexWrap: "wrap" as const,
        alignItems: "center" as const,
        alignSelf: "flex-start" as const,
        gap: compact ? 12 : 16,
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
      list: {
        gap: 0,
      },
      row: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 10,
        paddingVertical: 10,
        borderTopWidth: 0,
        borderTopColor: theme.colors.border,
      },
      rowFirst: {
        borderTopWidth: 0,
        paddingTop: 2,
      },
      rowMain: {
        flex: 1,
        minWidth: 0,
        gap: 2,
      },
      rowTitle: {
        color: theme.colors.foreground,
        fontSize: 13,
        fontWeight: "500" as const,
      },
      rowMeta: {
        color: theme.colors.foregroundMuted,
        fontSize: 11,
      },
      countBadge: {
        minWidth: 22,
        alignItems: "flex-end" as const,
      },
      countText: {
        color: theme.colors.foregroundMuted,
        fontSize: 12,
        fontVariant: ["tabular-nums" as const],
      },
      empty: {
        color: theme.colors.foregroundMuted,
        fontSize: 13,
        paddingVertical: 4,
      },
      detailHeader: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        gap: 8,
      },
      backRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 4,
      },
      back: {
        color: theme.colors.foregroundMuted,
        fontSize: 12,
        fontWeight: "500" as const,
      },
      panelButton: {
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: theme.colors.surface2,
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 6,
      },
      title: {
        color: theme.colors.foreground,
        fontSize: compact ? 15 : 16,
        fontWeight: "600" as const,
        flexShrink: 1,
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
    [theme, compact],
  );

  // Cached pill data (QueryClient or module cache) must paint immediately; only
  // spin when we have nothing to show yet.
  const loading = !usage.data && usage.isLoading;
  const error = usage.error;
  const showTabs = skillItems.length > 0 && mcpItems.length > 0;

  if (skillDetail) {
    return (
      <View style={styles.root}>
        <View style={styles.detailHeader}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setSkillDetail(null)}
            style={styles.backRow}
          >
            <Icon name="ChevronLeft" size={14} color={theme.colors.foregroundMuted} />
            <Text style={styles.back}>Skills</Text>
          </Pressable>
          {openSkillInPanel ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open SKILL.md in panel"
              style={styles.panelButton}
              onPress={() => {
                openSkillInPanel(skillDetail);
                close();
              }}
            >
              <Icon name="ArrowUpRight" size={14} color={theme.colors.foregroundMuted} />
              <Text style={styles.back}>Open in tab</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.title}>{formatDisplayName(skillDetail.skillName)}</Text>
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
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {showTabs ? (
        <View style={styles.tabRow}>
          {(
            [
              ["skills", "Skills"],
              ["mcp", "MCP"],
            ] as const
          ).map(([id, label]) => {
            const active = tab === id;
            return (
              <Pressable
                key={id}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setTab(id)}
                style={{ paddingVertical: 6 }}
              >
                <Text style={active ? styles.tabActive : styles.tab}>{label}</Text>
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

      {!loading && !error && skillItems.length === 0 && mcpItems.length === 0 ? (
        <Text style={styles.empty}>No skill or MCP calls yet</Text>
      ) : null}

      {tab === "skills" && skillItems.length > 0 ? (
        <View style={styles.list}>
          {skillItems.map((item, index) => {
            const name = formatDisplayName(item.skillName);
            const rowStyle = [styles.row, index === 0 ? styles.rowFirst : null];
            const content = (
              <>
                <Icon name="Sparkles" size={16} color={theme.colors.foregroundMuted} />
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {name}
                  </Text>
                  {item.lastUsedAt ? (
                    <Text style={styles.rowMeta}>{formatDayTime(item.lastUsedAt)}</Text>
                  ) : null}
                </View>
                <CountBadge value={item.total} styles={styles} />
              </>
            );
            if (item.skillPath) {
              return (
                <Pressable
                  key={item.skillName}
                  accessibilityRole="link"
                  accessibilityLabel={`Open ${name} SKILL.md`}
                  onPress={() =>
                    setSkillDetail({ skillName: item.skillName, path: item.skillPath! })
                  }
                  style={rowStyle}
                >
                  {content}
                </Pressable>
              );
            }
            return (
              <View key={item.skillName} style={rowStyle}>
                {content}
              </View>
            );
          })}
        </View>
      ) : null}

      {tab === "mcp" && mcpItems.length > 0 ? (
        <View style={styles.list}>
          {mcpItems.map((item, index) => (
            <View
              key={`${item.server}.${item.tool}`}
              style={[styles.row, index === 0 ? styles.rowFirst : null]}
            >
              <Icon name="Plug" size={16} color={theme.colors.foregroundMuted} />
                <View style={styles.rowMain}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {formatDisplayName(`${item.server}.${item.tool}`)}
                </Text>
                {item.failures > 0 ? (
                  <Text style={styles.rowMeta}>{item.failures} failed</Text>
                ) : item.lastUsedAt ? (
                  <Text style={styles.rowMeta}>{formatDayTime(item.lastUsedAt)}</Text>
                ) : null}
              </View>
              <CountBadge value={item.count} styles={styles} />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
