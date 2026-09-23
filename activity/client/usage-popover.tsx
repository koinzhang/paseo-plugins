import {
  type PluginButtonContentProps,
  useRpc,
} from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  usageReadSkillRpc,
} from "../shared/usage.ts";
import { formatDisplayName } from "../shared/format.ts";
import { FormattedTime } from "./formatted-time.tsx";
import { useUsagePillData } from "./usage-query.tsx";
import { useMessages } from "./use-app-language.ts";
import {
  CountText,
  ErrorState,
  IconButton,
  InlineEmpty,
  LoadingState,
  SectionHeader,
} from "./ui.tsx";
import {
  ICON_SIZE,
  RADIUS,
  ROW_PADDING,
  TEXT,
  popoverFrame,
  sectionTitle,
  titleGap,
} from "./design-tokens.ts";


export type SkillDetail = { skillName: string; path: string };

export type UsagePopoverProps = PluginButtonContentProps & {
  /** Open this SKILL.md in the agent Usage workspace panel (Skills-plugin pattern). */
  openSkillInPanel?: (skill: SkillDetail) => void;
};

/**
 * Composer-pill popover body. Host owns anchoring / sheet chrome / outer scroll;
 * render content only.
 */
export function UsagePopover(props: UsagePopoverProps) {
  const m = useMessages();
  if (props.context !== "agent") {
    return <InlineEmpty text={m.common.agentOnly} color={props.theme.colors.foregroundMuted} />;
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
  const m = useMessages();

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
        ...popoverFrame(compact),
      },
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
      ? { icon: "Plug" as const, accessibilityLabel: m.common.showMcp, next: "mcp" as const }
      : { icon: "Sparkles" as const, accessibilityLabel: m.common.showSkills, next: "skills" as const };

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
            <Text style={styles.back}>{m.common.skills}</Text>
          </Pressable>
          {openSkillInPanel ? (
            <IconButton
              icon="ArrowUpRight"
              label={m.common.openSkillInPanel}
              color={theme.colors.foregroundMuted}
              onPress={() => {
                openSkillInPanel(skillDetail);
                close();
              }}
            />
          ) : null}
        </View>
        <Text style={styles.title}>{formatDisplayName(skillDetail.skillName)}</Text>
        {skillFile.isLoading ? <LoadingState color={theme.colors.accent} /> : null}
        {skillFile.error ? (
          <ErrorState error={skillFile.error} onRetry={() => void skillFile.refetch()} colors={theme.colors} />
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
        <SectionHeader title={tab === "skills" ? m.common.skills : m.common.mcp} colors={theme.colors} compact>
          {showToggle ? (
            <IconButton
              icon={toggleAction.icon}
              label={toggleAction.accessibilityLabel}
              onPress={() => setTab(toggleAction.next)}
              color={theme.colors.foregroundMuted}
            />
          ) : null}
        </SectionHeader>
      ) : null}

      {loading ? <LoadingState color={theme.colors.accent} /> : null}
      {error ? <ErrorState error={error} onRetry={() => void usage.refetch()} colors={theme.colors} /> : null}

      {!loading && !error && skillItems.length === 0 && mcpItems.length === 0 ? (
        <InlineEmpty text={m.common.noSkillOrMcp} color={theme.colors.foregroundMuted} />
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
                <CountText value={item.total} color={theme.colors.foregroundMuted} />
              </>
            );
            if (item.skillPath) {
              return (
                <Pressable
                  key={item.skillName}
                  accessibilityRole="link"
                  accessibilityLabel={m.common.openSkillFile(name)}
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
                  <Text style={styles.rowMeta}>{m.common.failed(item.failures)}</Text>
                ) : item.lastUsedAt ? (
                  <FormattedTime iso={item.lastUsedAt} style={styles.rowMeta} />
                ) : null}
              </View>
              <CountText value={item.count} color={theme.colors.foregroundMuted} />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
