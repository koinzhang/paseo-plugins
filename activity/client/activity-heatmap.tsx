import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { ActivityDay } from "../shared/usage.ts";
import { activityLevel, buildActivityCalendar, type HeatmapMode } from "../shared/activity.ts";
import { useAppLanguage } from "./use-app-language.ts";
export { computeStreaks, type HeatmapMode } from "../shared/activity.ts";

type ThemeColors = {
  accent: string; border: string; foreground: string; foregroundMuted: string;
  surface0: string; surface1: string; surface2: string;
};

type HoveredMonth = { year: number; month: number };

// Derive the activity palette from the active theme.
function mix(base: string, accent: string, amount: number): string {
  const parse = (value: string) => {
    const hex = value.replace("#", "");
    const expanded = hex.length === 3 || hex.length === 4
      ? hex.split("").map((c) => c + c).join("")
      : hex;
    // Use first 6 digits only — ignore trailing alpha on 8-digit hex.
    const rgb = expanded.slice(0, 6);
    return [0, 2, 4].map((i) => parseInt(rgb.slice(i, i + 2), 16));
  };
  const a = parse(base); const b = parse(accent);
  return `rgb(${a.map((v, i) => Math.round(v + (b[i]! - v) * amount)).join(",")})`;
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count.toLocaleString()} ${count === 1 ? singular : pluralForm}`;
}

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
  const [width, setWidth] = useState(0);
  const [gridTop, setGridTop] = useState(0);
  const [scrollX, setScrollX] = useState(0);
  const [tooltipSize, setTooltipSize] = useState({ width: 220, height: 28 });
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
  const palette = [colors.surface2, ...[0.22, 0.43, 0.68, 1].map(n => mix(colors.surface2, colors.accent, n))];
  const activeKey = hovered ?? selected;
  const activeIndex = weeks.flat().findIndex(cell => cell.key === activeKey);
  const active = activeIndex >= 0 ? weeks.flat()[activeIndex] : undefined;
  const anchorX = Math.floor(activeIndex / 7) * (cellSize + gap) + cellSize / 2 - scrollX;
  const anchorY = gridTop + (activeIndex % 7) * (cellSize + gap);
  const tooltipLeft = Math.max(0, Math.min(anchorX - tooltipSize.width / 2, width - tooltipSize.width));
  const tooltipTop = Math.max(0, anchorY - tooltipSize.height - 8);
  const dateLabel = active ? (() => {
    const [year, month, day] = active.key.split("-").map(Number);
    return new Date(year!, month! - 1, day!).toLocaleDateString(locale, {
      month: "short", day: "numeric", year: year !== new Date().getFullYear() ? "numeric" : undefined,
    });
  })() : "";
  const datePrefix = mode === "weekly" ? "in week containing" : mode === "cumulative" ? "through" : "on";
  const tooltipText = active
    ? `${plural(active.skills, "skill")}, ${plural(active.mcp, "mcp")}, ${plural(active.agents, "agent")}, ${plural(active.messages, "message")} ${datePrefix} ${dateLabel}`
    : "";
  const axisWidth = needsScroll ? gridWidth : width;
  const modeLabel = mode === "weekly" ? "Week containing" : mode === "cumulative" ? "Through" : "";
  const monthBorder = mix(colors.surface2, colors.accent, 0.35);
  return (
    <View style={{ gap: compact ? 10 : 12 }} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Text style={{ color: colors.foreground, fontSize: compact ? 13 : 15, fontWeight: "500" }}>Activity</Text>
        <View style={{ flexDirection: "row", gap: compact ? 14 : 20 }}>
          {modeOptions.map(option => (
            <Pressable key={option.id} accessibilityRole="tab" accessibilityState={{ selected: mode === option.id }} onPress={() => onModeChange(option.id)} style={{ paddingVertical: 6 }}>
              <Text style={{ color: mode === option.id ? colors.foreground : colors.foregroundMuted, fontSize: compact ? 13 : 15 }}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <ScrollView
        horizontal
        scrollEnabled={needsScroll}
        showsHorizontalScrollIndicator={needsScroll}
        onLayout={event => setGridTop(event.nativeEvent.layout.y)}
        onScroll={event => setScrollX(event.nativeEvent.contentOffset.x)}
        scrollEventThrottle={16}
      >
        <View style={{ width: Math.max(0, axisWidth), paddingBottom: 4 }}>
          <View style={{ flexDirection: "row", gap }}>
            {weeks.map((week, i) => (
              <View key={i} style={{ gap }}>
                {week.map(cell => {
                  const hidden = cell.future || cell.excluded;
                  const monthHighlight = !hidden && cellInMonth(cell.key, hoveredMonth);
                  return (
                    <Pressable key={cell.key} disabled={hidden} accessibilityRole="button"
                      accessibilityLabel={`${modeLabel} ${cell.key}: ${cell.total} activity, ${cell.skills} skills, ${cell.mcp} MCP, ${cell.agents} agents, ${cell.messages} messages`}
                      accessibilityState={{ selected: activeKey === cell.key }}
                      onHoverIn={() => setHovered(cell.key)} onHoverOut={() => setHovered(null)}
                      onFocus={() => setHovered(cell.key)} onBlur={() => setHovered(null)}
                      onPress={() => setSelected(prev => prev === cell.key ? null : cell.key)}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        borderRadius: Math.max(2, cellSize / 4),
                        backgroundColor: palette[activityLevel(cell.total, max)],
                        borderWidth: monthHighlight ? 0.1 : 0,
                        borderColor: monthHighlight ? monthBorder : "transparent",
                        opacity: hidden ? 0 : 1,
                      }} />
                  );
                })}
              </View>
            ))}
          </View>
          <View style={{ height: 24, marginTop: 10, flexDirection: "row", justifyContent: "space-between" }}>
            {months.map((item, i) => {
              const activeMonth =
                hoveredMonth?.year === item.year && hoveredMonth.month === item.month;
              return (
                <Pressable
                  key={`${item.year}-${item.month}-${i}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Highlight ${item.label}`}
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
                      fontSize: 12,
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
        <View pointerEvents="none"
          onLayout={event => setTooltipSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}
          style={{ position: "absolute", left: tooltipLeft, top: tooltipTop, zIndex: 10,
            maxWidth: width || 220, paddingHorizontal: 10, paddingVertical: 6,
            borderRadius: 8, backgroundColor: colors.surface2,
            borderWidth: 1, borderColor: colors.border }}>
          <Text accessibilityLiveRegion="polite" style={{ color: colors.foreground, fontSize: 12, lineHeight: 16 }}>
            {tooltipText}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
