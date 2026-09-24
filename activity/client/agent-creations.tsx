import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  buildAgentCreationBuckets,
  buildDailyMetricBuckets,
  rankCreationProviders,
  stackCreationProviders,
  type CreationBucket,
  type ActivityMetric,
  type CreationProviderSlice,
} from "../shared/activity.ts";
import type { ActivityDay, AgentCreationDay } from "../shared/usage.ts";
import { creationBarColor } from "./color-mix.ts";
import { chartColorScheme, creationProviderColors } from "./rank-color.ts";
import { fixedWindowFrom } from "./range.ts";
import { RADIUS, TEXT, sectionTitle, titleGap } from "./design-tokens.ts";
import { messagesFor } from "../shared/i18n.ts";
import { ChartTooltip, InlineEmpty, MetricStepper } from "./ui.tsx";

type ThemeColors = {
  accent: string;
  border: string;
  foreground: string;
  foregroundMuted: string;
  surface0: string;
  surface2: string;
};

function bucketDate(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year!, month! - 1, day!);
}

/** Locale month + day, e.g. `Sep 6` / `9月6日`. */
function dayLabel(key: string, locale: string): string {
  return bucketDate(key).toLocaleDateString(locale, { month: "short", day: "numeric" });
}

/**
 * Daily bars over a fixed window (051 / 057): the last `windowDays` days
 * ending today. Each day is one accent-intensity bar (057). The header switch
 * (070) picks the metric; Sessions hovers show a provider breakdown card
 * (nonzero that day only, 056), other metrics come from `activityDays` and
 * show the day total only.
 */
export function AgentCreations({ days, activityDays, windowDays, colors, compact, locale }: {
  days: readonly AgentCreationDay[];
  activityDays: readonly ActivityDay[];
  windowDays: number;
  colors: ThemeColors;
  compact?: boolean;
  locale: string;
}) {
  const [metric, setMetric] = useState<ActivityMetric>("sessions");
  const from = fixedWindowFrom(windowDays);
  const buckets = useMemo(
    () =>
      metric === "sessions"
        ? buildAgentCreationBuckets(days, { from })
        : buildDailyMetricBuckets(activityDays, metric, { from }),
    [days, activityDays, metric, from],
  );
  const providers = useMemo(() => rankCreationProviders(buckets), [buckets]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    setHovered(null);
    setSelected(null);
    // Only the window start invalidates the selection: refetching the same
    // window must not close a tooltip the pointer is resting on (051).
  }, [from, metric]);

  const activeKey = hovered ?? selected;
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  const max = buckets.reduce((peak, bucket) => Math.max(peak, bucket.count), 0);
  const activeIndex = buckets.findIndex((bucket) => bucket.key === activeKey);
  const active = activeIndex >= 0 ? buckets[activeIndex] : undefined;
  const chartHeight = compact ? 56 : 72;
  const gap = compact ? 2 : 3;
  const slot = buckets.length > 0 ? (width + gap) / buckets.length : 0;
  const anchorX = activeIndex >= 0 ? activeIndex * slot + (slot - gap) / 2 : 0;
  const scheme = chartColorScheme(colors.surface0);
  const colorByProvider = creationProviderColors(
    providers.map((item) => item.provider),
    scheme,
  );
  const tooltipProviders = active
    ? stackCreationProviders(providers, active.providers)
    : [];
  const first = buckets[0];
  const m = messagesFor(locale);
  const unit = (count: number) =>
    metric === "sessions"
      ? m.units.sessions(count)
      : metric === "prompts"
        ? m.units.prompts(count)
        : metric === "skills"
          ? m.units.skills(count)
          : m.units.mcp(count);

  return (
    <View style={{ gap: titleGap(compact) }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Text style={{ ...sectionTitle(compact), color: colors.foreground }}>
          {m.creations.title}
        </Text>
        <MetricStepper value={metric} onChange={setMetric} colors={colors} />
      </View>

      {total === 0 ? (
        <InlineEmpty text={m.creations.empty(windowDays)} color={colors.foregroundMuted} />
      ) : (
        <View style={{ gap: 6 }}>
          <View style={{ position: "relative" }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap, height: chartHeight }}>
              {buckets.map((bucket) => (
                <Pressable
                  key={bucket.key}
                  accessibilityRole="button"
                  accessibilityLabel={`${dayLabel(bucket.key, locale)}: ${unit(bucket.count)}${providerBreakdown(bucket, providers)}`}
                  accessibilityState={{ selected: activeKey === bucket.key }}
                  onHoverIn={() => setHovered(bucket.key)}
                  onHoverOut={() => setHovered(null)}
                  onFocus={() => setHovered(bucket.key)}
                  onBlur={() => setHovered(null)}
                  onPress={() => setSelected((prev) => (prev === bucket.key ? null : bucket.key))}
                  style={{
                    flex: 1,
                    minWidth: 3,
                    height: chartHeight,
                    justifyContent: "flex-end",
                  }}
                >
                  {bucket.count === 0 ? (
                    <View style={{ height: 2, backgroundColor: colors.surface2 }} />
                  ) : (
                    <View
                      style={{
                        height: max > 0 ? Math.max(2, Math.round((bucket.count / max) * chartHeight)) : 2,
                        backgroundColor: creationBarColor(
                          bucket.count,
                          max,
                          colors.surface2,
                          colors.accent,
                        ),
                        borderTopLeftRadius: RADIUS.swatch,
                        borderTopRightRadius: RADIUS.swatch,
                      }}
                    />
                  )}
                </Pressable>
              ))}
            </View>
            {active && width > 0 ? (
              <ChartTooltip
                anchorX={anchorX}
                anchorY={0}
                containerWidth={width}
                clampTop={false}
                title={`${dayLabel(active.key, locale)} · ${unit(active.count)}`}
                rows={tooltipProviders.map((item) => ({
                  label: item.label,
                  value: item.count.toLocaleString(locale),
                  color: colorByProvider.get(item.provider) ?? colors.accent,
                }))}
                colors={colors}
              />
            ) : null}
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ ...TEXT.meta, color: colors.foregroundMuted }}>
              {first ? dayLabel(first.key, locale) : ""}
            </Text>
            <Text style={{ ...TEXT.meta, color: colors.foregroundMuted }}>{m.common.today}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

function providerBreakdown(
  bucket: CreationBucket,
  ranked: readonly CreationProviderSlice[],
): string {
  const stacked = stackCreationProviders(ranked, bucket.providers);
  if (stacked.length === 0) return "";
  // Top→bottom to match the painted stack.
  return ` — ${stacked.map((slice) => `${slice.label} ${slice.count}`).join(", ")}`;
}
