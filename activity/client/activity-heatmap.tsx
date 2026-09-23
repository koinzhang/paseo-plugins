import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { ActivityDay } from "../shared/usage.ts";
import { activityLevel, buildActivityCalendar, type HeatmapMode } from "../shared/activity.ts";
import { useAppLanguage } from "./use-app-language.ts";
import { useMeasuredWidth } from "./measured-width.ts";
import { ACTIVITY_MIX_STEPS, mixColor } from "./color-mix.ts";
export { computeStreaks, type HeatmapMode } from "../shared/activity.ts";
import { FONT_SIZE, sectionTitle, titleGap } from "./design-tokens.ts";
import { messagesFor } from "../shared/i18n.ts";
import { ChartTooltip, TextTabs } from "./ui.tsx";

type ThemeColors = {
  accent: string; border: string; foreground: string; foregroundMuted: string;
  surface0: string; surface1: string; surface2: string;
};

type HoveredMonth = { year: number; month: number };

// Month-axis labels and the mode tabs share the label size: both are secondary labels
// under the section title, so a separate 13 / 15 scale made the tabs outrank the axis.
const LABEL_FONT_SIZE = FONT_SIZE.label;

function cellInMonth(dateKey: string, hovered: HoveredMonth | null): boolean {
  if (!hovered) return false;
  const [year, month] = dateKey.split("-").map(Number);
  return year === hovered.year && month === hovered.month + 1;
}

export function ActivityHeatmap({ days, from, colors, compact, mode, onModeChange, modeOptions }: {
  days: readonly ActivityDay[]; from?: string; colors: ThemeColors; compact?: boolean;
  mode: HeatmapMode; onModeChange: (mode: HeatmapMode) => void;
  modeOptions: ReadonlyArray<{ id: HeatmapMode; label: string }>;
}) {
  const locale = useAppLanguage();
  const [width, widthRef, onWidthLayout] = useMeasuredWidth("global:heatmap");
  const [gridTop, setGridTop] = useState(0);
  const [scrollX, setScrollX] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [hoveredMonth, setHoveredMonth] = useState<HoveredMonth | null>(null);
  useEffect(() => {
    setSelected(null);
    setHovered(null);
    setHoveredMonth(null);
  }, [from, mode, days]);
  const { weeks, months, max } = useMemo(() => buildActivityCalendar(days, mode, from, new Date(), locale), [days, mode, from, locale]);
  const gap = compact ? 2 : 3;
  // Fit the full year into the measured width (no min floor — avoid horizontal overflow).
  const cellSize =
    width > 0 && weeks.length > 0
      ? Math.min(18, Math.max(0, (width - gap * (weeks.length - 1)) / weeks.length))
      : 0;
  const gridWidth = weeks.length > 0 ? weeks.length * (cellSize + gap) - gap : 0;
  const needsScroll = gridWidth > width + 0.5;
  const palette = [colors.surface2, ...ACTIVITY_MIX_STEPS.map(n => mixColor(colors.surface2, colors.accent, n))];
  const activeKey = hovered ?? selected;
  const activeIndex = weeks.flat().findIndex(cell => cell.key === activeKey);
  const active = activeIndex >= 0 ? weeks.flat()[activeIndex] : undefined;
  const anchorX = Math.floor(activeIndex / 7) * (cellSize + gap) + cellSize / 2 - scrollX;
  const anchorY = gridTop + (activeIndex % 7) * (cellSize + gap);
  const dateLabel = active ? (() => {
    const [year, month, day] = active.key.split("-").map(Number);
    return new Date(year!, month! - 1, day!).toLocaleDateString(locale, {
      month: "short", day: "numeric", year: year !== new Date().getFullYear() ? "numeric" : undefined,
    });
  })() : "";
  const m = messagesFor(locale);
  const periodLabel = (date: string) =>
    mode === "weekly" ? m.heatmap.weekContaining(date) : mode === "cumulative" ? m.heatmap.through(date) : date;
  const tooltipRows = active
    ? [
        { label: m.common.messages, value: active.messages.toLocaleString(locale) },
        { label: m.common.agents, value: active.agents.toLocaleString(locale) },
        { label: m.common.skills, value: active.skills.toLocaleString(locale) },
        { label: m.common.mcp, value: active.mcp.toLocaleString(locale) },
      ]
    : [];
  const axisWidth = needsScroll ? gridWidth : width;
  const monthFocus = hoveredMonth != null;
  return (
    <View
      ref={widthRef}
      style={{ gap: titleGap(compact) }}
      onLayout={onWidthLayout}
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Text style={{ ...sectionTitle(compact), color: colors.foreground }}>{m.heatmap.title}</Text>
        <TextTabs options={modeOptions} value={mode} onChange={onModeChange} colors={colors} variant="chart" gap={compact ? 14 : 20} />
      </View>
      <ScrollView
        horizontal
        scrollEnabled={needsScroll}
        showsHorizontalScrollIndicator={needsScroll}
        onLayout={event => setGridTop(event.nativeEvent.layout.y)}
        onScroll={event => setScrollX(event.nativeEvent.contentOffset.x)}
        scrollEventThrottle={16}
      >
        <View style={{ width: Math.max(0, axisWidth) }}>
          <View style={{ flexDirection: "row", gap }}>
            {weeks.map((week, i) => (
              <View key={i} style={{ gap }}>
                {week.map(cell => {
                  const hidden = cell.future || cell.excluded;
                  const inMonth = cellInMonth(cell.key, hoveredMonth);
                  const level = activityLevel(cell.total, max);
                  const base = palette[level]!;
                  // Focus = leave target month as-is; gently mute others toward surface2
                  // (same space as empty cells — preserves activity hue, avoids surface0 parse issues).
                  const fill =
                    hidden
                      ? base
                      : monthFocus && inMonth
                        ? mixColor(base, colors.accent, 0.04)
                        : base;
                  const opacity = hidden
                    ? 0
                    : monthFocus && !inMonth
                      ? 0.64
                      : 1;
                  return (
                    <Pressable key={cell.key} disabled={hidden} accessibilityRole="button"
                      accessibilityLabel={`${periodLabel(cell.key)}: ${m.units.messages(cell.messages)}, ${m.units.agents(cell.agents)}, ${m.units.skills(cell.skills)}, ${m.units.mcp(cell.mcp)}`}
                      accessibilityState={{ selected: activeKey === cell.key }}
                      onHoverIn={() => setHovered(cell.key)} onHoverOut={() => setHovered(null)}
                      onFocus={() => setHovered(cell.key)} onBlur={() => setHovered(null)}
                      onPress={() => setSelected(prev => prev === cell.key ? null : cell.key)}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        borderRadius: Math.max(2, cellSize / 4),
                        backgroundColor: fill,
                        opacity,
                      }} />
                  );
                })}
              </View>
            ))}
          </View>
          <View style={{ marginTop: 10, flexDirection: "row", justifyContent: "space-between" }}>
            {months.map((item, i) => {
              const activeMonth =
                hoveredMonth?.year === item.year && hoveredMonth.month === item.month;
              return (
                <Pressable
                  key={`${item.year}-${item.month}-${i}`}
                  accessibilityRole="button"
                  accessibilityLabel={m.heatmap.highlightMonth(item.label)}
                  onHoverIn={() => setHoveredMonth({ year: item.year, month: item.month })}
                  onHoverOut={() => setHoveredMonth(null)}
                  onFocus={() => setHoveredMonth({ year: item.year, month: item.month })}
                  onBlur={() => setHoveredMonth(null)}
                  style={{ paddingVertical: 2 }}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      color: activeMonth ? colors.foreground : colors.foregroundMuted,
                      fontSize: LABEL_FONT_SIZE,
                    }}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
      {active && anchorX >= 0 && anchorX <= width ? (
        <ChartTooltip
          anchorX={anchorX}
          anchorY={anchorY}
          containerWidth={width}
          title={periodLabel(dateLabel)}
          rows={tooltipRows}
          colors={colors}
        />
      ) : null}
    </View>
  );
}
