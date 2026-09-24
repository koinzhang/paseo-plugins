import { Icon } from "@getpaseo/plugin/client/react-native";
import { useMemo, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { metricValue, type ActivityMetric } from "../shared/activity.ts";
import { messagesFor } from "../shared/i18n.ts";
import { CONTROL, ICON_SIZE, RADIUS, ROW_PADDING, TEXT, pillRadius, sectionTitle, titleGap } from "./design-tokens.ts";
import { InlineEmpty, MetricStepper } from "./ui.tsx";

const BAR_HEIGHT = 6;
const SWATCH_SIZE = 10;
const VISIBLE_ROWS = 5;

export type RankingEntry = {
  key: string;
  label: string;
  /** Leading swatch colour. */
  color: string;
  agents: number;
  messages: number;
  skills: number;
  mcp: number;
};

/**
 * Ranked bars with a `‹ Sessions ›` metric switch (069 Providers, 070
 * Projects). Shows the top five nonzero entries until expanded; `highlight`
 * dims the others instead of hiding them. Bars use the top value for scale.
 */
export function RankingBars({ title, empty, entries, highlight, colors, compact, locale }: {
  title: string;
  empty: string;
  entries: readonly RankingEntry[];
  /** Entry key to keep at full opacity; omit to show all at full opacity. */
  highlight?: string;
  colors: { accent: string; foreground: string; foregroundMuted: string; surface2: string };
  compact?: boolean;
  locale: string;
}): ReactNode {
  const [metric, setMetric] = useState<ActivityMetric>("sessions");
  const [expanded, setExpanded] = useState(false);
  const m = messagesFor(locale);
  const rows = useMemo(
    () =>
      entries
        .map((entry) => ({ ...entry, value: metricValue(entry, metric) }))
        .filter((row) => row.value > 0)
        .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label)),
    [entries, metric],
  );
  const max = rows[0]?.value ?? 0;
  const hiddenCount = Math.max(0, rows.length - VISIBLE_ROWS);
  const visibleRows = expanded ? rows : rows.slice(0, VISIBLE_ROWS);
  const toggleLabel = expanded ? m.global.ranking.showLess : m.global.ranking.showMore(hiddenCount);

  return (
    <View style={{ gap: titleGap(compact) - 2 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Text style={{ ...sectionTitle(compact), color: colors.foreground, flexShrink: 1 }} numberOfLines={1}>
          {title}
        </Text>
        <MetricStepper value={metric} onChange={setMetric} colors={colors} />
      </View>
      {rows.length === 0 ? (
        <InlineEmpty text={empty} color={colors.foregroundMuted} />
      ) : (
        <View style={{ gap: 2 }}>
          {visibleRows.map((row) => (
            <View
              key={row.key}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: compact ? 10 : 16,
                paddingVertical: ROW_PADDING.regular,
                opacity: highlight == null || highlight === row.key ? 1 : 0.4,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, width: compact ? 110 : 180 }}>
                <View
                  style={{
                    width: SWATCH_SIZE,
                    height: SWATCH_SIZE,
                    borderRadius: RADIUS.swatch,
                    backgroundColor: row.color,
                  }}
                />
                <Text style={{ ...TEXT.body, color: colors.foreground, flex: 1, minWidth: 0 }} numberOfLines={1}>
                  {row.label}
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  height: BAR_HEIGHT,
                  borderRadius: pillRadius(BAR_HEIGHT),
                  backgroundColor: colors.surface2,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: `${max > 0 ? Math.max(1, (row.value / max) * 100) : 0}%`,
                    height: BAR_HEIGHT,
                    borderRadius: pillRadius(BAR_HEIGHT),
                    backgroundColor: colors.accent,
                  }}
                />
              </View>
              <Text
                style={{ ...TEXT.body, color: colors.foregroundMuted, fontVariant: ["tabular-nums"], minWidth: 48, textAlign: "right" }}
              >
                {row.value.toLocaleString(locale)}
              </Text>
            </View>
          ))}
          {hiddenCount > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={toggleLabel}
              accessibilityState={{ expanded }}
              hitSlop={CONTROL.hitSlop}
              onPress={() => setExpanded((value) => !value)}
              style={{ alignSelf: "flex-end", flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: ROW_PADDING.dense }}
            >
              <Text style={{ ...TEXT.body, color: colors.foregroundMuted }}>{toggleLabel}</Text>
              <Icon name={expanded ? "ChevronUp" : "ChevronDown"} size={ICON_SIZE.inline} color={colors.foregroundMuted} />
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}
