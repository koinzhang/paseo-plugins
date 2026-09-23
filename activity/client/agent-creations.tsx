import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  buildAgentCreationBuckets,
  rankCreationProviders,
  stackCreationProviders,
  type CreationBucket,
  type CreationProviderSlice,
} from "../shared/activity.ts";
import type { AgentCreationDay } from "../shared/usage.ts";
import { creationBarColor } from "./color-mix.ts";
import { chartColorScheme, creationProviderColors } from "./rank-color.ts";
import { fixedWindowFrom } from "./range.ts";
import { RADIUS, TEXT, sectionTitle, titleGap, tooltipSurface } from "./design-tokens.ts";

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

function agentCountText(count: number): string {
  return `${count} ${count === 1 ? "agent" : "agents"}`;
}

/**
 * Agent creations per local day over a fixed window (051 / 057): the last
 * `windowDays` days ending today, independent of the range chips. Each day is
 * one accent-intensity bar (057); hovering shows a provider breakdown card
 * (nonzero that day only, 056) with brand-coloured chips and the date.
 */
export function AgentCreations({ days, windowDays, colors, compact, locale }: {
  days: readonly AgentCreationDay[];
  windowDays: number;
  colors: ThemeColors;
  compact?: boolean;
  locale: string;
}) {
  const from = fixedWindowFrom(windowDays);
  const buckets = useMemo(
    () => buildAgentCreationBuckets(days, { from }),
    [days, from],
  );
  const providers = useMemo(() => rankCreationProviders(buckets), [buckets]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [width, setWidth] = useState(0);
  const [tooltipSize, setTooltipSize] = useState({ width: 150, height: 0 });
  useEffect(() => {
    setHovered(null);
    setSelected(null);
    // Only the window start invalidates the selection: refetching the same
    // window must not close a tooltip the pointer is resting on (051).
  }, [from]);

  const activeKey = hovered ?? selected;
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  const max = buckets.reduce((peak, bucket) => Math.max(peak, bucket.count), 0);
  const activeIndex = buckets.findIndex((bucket) => bucket.key === activeKey);
  const active = activeIndex >= 0 ? buckets[activeIndex] : undefined;
  const chartHeight = compact ? 56 : 72;
  const gap = compact ? 2 : 3;
  const slot = buckets.length > 0 ? (width + gap) / buckets.length : 0;
  const anchorX = activeIndex >= 0 ? activeIndex * slot + (slot - gap) / 2 : 0;
  const tooltipLeft = Math.max(0, Math.min(anchorX - tooltipSize.width / 2, width - tooltipSize.width));
  const scheme = chartColorScheme(colors.surface0);
  const colorByProvider = creationProviderColors(
    providers.map((item) => item.provider),
    scheme,
  );
  const tooltipProviders = active
    ? stackCreationProviders(providers, active.providers)
    : [];
  const first = buckets[0];

  return (
    <View style={{ gap: titleGap(compact) }}>
      <Text style={{ ...sectionTitle(compact), color: colors.foreground }}>
        Agents
      </Text>

      {total === 0 ? (
        <Text style={{ ...TEXT.small, color: colors.foregroundMuted }}>
          No agents created in the last {windowDays} days
        </Text>
      ) : (
        <View style={{ gap: 6 }}>
          <View style={{ position: "relative" }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap, height: chartHeight }}>
              {buckets.map((bucket) => (
                <Pressable
                  key={bucket.key}
                  accessibilityRole="button"
                  accessibilityLabel={`${dayLabel(bucket.key, locale)}: ${agentCountText(bucket.count)}${providerBreakdown(bucket, providers)}`}
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
                  {bucket.providers.length === 0 ? (
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
              <View
                pointerEvents="none"
                onLayout={(event) =>
                  setTooltipSize({
                    width: event.nativeEvent.layout.width,
                    height: event.nativeEvent.layout.height,
                  })
                }
                style={{
                  position: "absolute",
                  left: tooltipLeft,
                  bottom: chartHeight + 6,
                  zIndex: 10,
                  ...tooltipSurface(colors),
                  gap: 4,
                }}
              >
                {tooltipProviders.map((item) => (
                  <View key={item.provider} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: RADIUS.swatch,
                        backgroundColor: colorByProvider.get(item.provider) ?? colors.accent,
                      }}
                    />
                    <Text style={{ ...TEXT.tooltip, color: colors.foreground }}>
                      {item.label}: {item.count}
                    </Text>
                  </View>
                ))}
                <Text
                  accessibilityLiveRegion="polite"
                  style={{ ...TEXT.tooltip, color: colors.foregroundMuted, marginTop: 2 }}
                >
                  {dayLabel(active.key, locale)}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ ...TEXT.meta, color: colors.foregroundMuted }}>
              {first ? dayLabel(first.key, locale) : ""}
            </Text>
            <Text style={{ ...TEXT.meta, color: colors.foregroundMuted }}>Today</Text>
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
