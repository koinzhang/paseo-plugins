import {
  type PluginButtonContentProps,
  useRpc,
} from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import {
  usageReadSkillRpc,
} from "../shared/usage.ts";
import { formatDisplayName } from "../shared/format.ts";
import { FormattedTime } from "./formatted-time.tsx";
import { useUsagePillData } from "./usage-query.tsx";
import {
  CONTROL,
  ICON_SIZE,
  RADIUS,
  ROW_PADDING,
  TEXT,
  iconButton,
  sectionTitle,
  titleGap,
} from "./design-tokens.ts";


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
        gap: titleGap(true),
        minWidth: compact ? undefined : 300,
        maxWidth: compact ? undefined : 380,
      },
      sectionHeaderRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        gap: 8,
      },
      sectionTitle: {
        ...sectionTitle(true),
        color: theme.colors.foreground,
        flexShrink: 1,
      },
      titleAction: iconButton,
      list: {
        gap: 2,
      },
      row: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 10,
        paddingVertical: ROW_PADDING.dense,
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
        gap: 3,
      },
      rowTitle: {
        ...TEXT.rowTitle,
        color: theme.colors.foreground,
      },
      rowMeta: {
        ...TEXT.meta,
        color: theme.colors.foregroundMuted,
      },
      countBadge: {
        minWidth: 22,
        alignItems: "flex-end" as const,
      },
      countText: {
        ...TEXT.count,
        color: theme.colors.foregroundMuted,
      },
      empty: {
        ...TEXT.small,
        color: theme.colors.foregroundMuted,
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
        ...TEXT.back,
        color: theme.colors.foregroundMuted,
      },
      panelButton: iconButton,
      title: {
        ...sectionTitle(true),
        color: theme.colors.foreground,
        flexShrink: 1,
      },
      body: {
        ...TEXT.code,
        color: theme.colors.foreground,
        backgroundColor: theme.colors.surface1,
        padding: 16,
        borderRadius: RADIUS.block,
      },
    }),
    [theme, compact],
  );

  const loading = !usage.data && usage.isLoading;
  const error = usage.error;
  const showToggle = skillItems.length > 0 && mcpItems.length > 0;
  const toggleAction =
    tab === "skills"
      ? { icon: "Plug" as const, accessibilityLabel: "Show MCP", next: "mcp" as const }
      : { icon: "Sparkles" as const, accessibilityLabel: "Show skills", next: "skills" as const };

  if (skillDetail) {
    return (
      <View style={styles.root}>
        <View style={styles.detailHeader}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setSkillDetail(null)}
            style={styles.backRow}
          >
            <Icon name="ChevronLeft" size={ICON_SIZE.action} color={theme.colors.foregroundMuted} />
            <Text style={styles.back}>Skills</Text>
          </Pressable>
          {openSkillInPanel ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open SKILL.md in panel"
              hitSlop={CONTROL.hitSlop}
              style={styles.panelButton}
              onPress={() => {
                openSkillInPanel(skillDetail);
                close();
              }}
            >
              <Icon name="ArrowUpRight" size={ICON_SIZE.action} color={theme.colors.foregroundMuted} />
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.title}>{formatDisplayName(skillDetail.skillName)}</Text>
        {skillFile.isLoading ? <ActivityIndicator color={theme.colors.accent} /> : null}
        {skillFile.error ? (
          <Text style={{ ...TEXT.small, color: theme.colors.statusDanger }}>
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
      {tab && (skillItems.length > 0 || mcpItems.length > 0) ? (
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{tab === "skills" ? "Skills" : "MCP"}</Text>
          {showToggle ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={toggleAction.accessibilityLabel}
              hitSlop={CONTROL.hitSlop}
              onPress={() => setTab(toggleAction.next)}
              style={styles.titleAction}
            >
              <Icon
                name={toggleAction.icon}
                size={ICON_SIZE.action}
                color={theme.colors.foregroundMuted}
              />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {loading ? <ActivityIndicator color={theme.colors.accent} /> : null}
      {error ? (
        <Text style={{ ...TEXT.small, color: theme.colors.statusDanger }}>
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
                <Icon name="Sparkles" size={ICON_SIZE.leading} color={theme.colors.foregroundMuted} />
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {name}
                  </Text>
                  {item.lastUsedAt ? (
                    <FormattedTime iso={item.lastUsedAt} style={styles.rowMeta} />
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
              <Icon name="Plug" size={ICON_SIZE.leading} color={theme.colors.foregroundMuted} />
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {formatDisplayName(`${item.server}.${item.tool}`)}
                </Text>
                {item.failures > 0 ? (
                  <Text style={styles.rowMeta}>{item.failures} failed</Text>
                ) : item.lastUsedAt ? (
                  <FormattedTime iso={item.lastUsedAt} style={styles.rowMeta} />
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
