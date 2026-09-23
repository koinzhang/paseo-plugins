import { useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, ScrollView, Text, View } from "react-native";
import type { ActivityHour } from "../shared/usage.ts";
import { useMeasuredWidth } from "./measured-width.ts";
import { mixColor } from "./color-mix.ts";
import { TEXT, sectionTitle, titleGap } from "./design-tokens.ts";

type ThemeColors = {
  accent: string;
  border: string;
  foreground: string;
  foregroundMuted: string;
  surface2: string;
};

/** Hours visible in one viewport; the step follows from the measured width. */
const VISIBLE_HOURS = 24;
const STROKE = 2;
/** Guards against a near-vertical segment asking for an absurd border band. */
const MAX_STROKE_BAND = 48;
/** A day label ("Sep 24") plus the right-pinned "Now" must fit, or the label overflows the scroll content. */
const NOW_LABEL_CLEARANCE = 72;

function hourRangeLabel(start: string, locale: string): string {
  const from = new Date(start);
  const to = new Date(from.getTime() + 60 * 60 * 1000);
  const day = from.toLocaleDateString(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const time = (value: Date) =>
    value.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${day} · ${time(from)}–${time(to)}`;
}

/**
 * Filled line series drawn with React Native primitives only (no SVG on the
 * host). Each hour gap is one clipped cell holding a `skewY` parallelogram:
 * its top edge is the polyline segment, its body is the area fill.
 */
function AreaSeries({
  values,
  max,
  height,
  slot,
  stroke,
  fill,
  flip,
}: {
  values: readonly number[];
  max: number;
  height: number;
  slot: number;
  stroke: string;
  fill: string;
  /** Mirror the series below the axis. */
  flip?: boolean;
}) {
  // Leave room for the stroke band so the peak is never clipped.
  const usable = Math.max(1, height - STROKE - 1);
  const scale = (value: number) => (max > 0 ? (value / max) * usable : 0);

  return (
    <View
      style={{
        height,
        flexDirection: "row",
        overflow: "hidden",
        transform: flip ? [{ scaleY: -1 }] : undefined,
      }}
    >
      {values.slice(0, -1).map((value, index) => {
        const left = scale(value);
        const right = scale(values[index + 1] ?? 0);
        // skewY(a) maps y -> y + (x - slot/2)·tan(a), so tan is the segment slope.
        const tan = (left - right) / slot;
        const angle = (Math.atan(tan) * 180) / Math.PI;
        // Vertical band that renders as a STROKE-thick perpendicular line.
        const band = Math.min(MAX_STROKE_BAND, STROKE * Math.hypot(1, tan));
        return (
          <View key={index} style={{ width: slot, height, overflow: "hidden" }}>
            <View
              style={{
                position: "absolute",
                left: 0,
                width: slot,
                // Place the sheared top edge on the two hour values, then lift
                // it by the band so a zero segment still paints its baseline.
                top: height - left + (slot / 2) * tan - band,
                height: height * 2 + slot * Math.abs(tan) + band,
                backgroundColor: fill,
                borderTopWidth: band,
                borderTopColor: stroke,
                transform: [{ skewY: `${angle}deg` }],
              }}
            />
          </View>
        );
      })}
    </View>
  );
}

export function HourlyActivityTimeline({
  hours,
  colors,
  compact,
  locale,
  resetKey,
}: {
  hours: readonly ActivityHour[];
  colors: ThemeColors;
  compact?: boolean;
  locale: string;
  /** Provider change re-anchors the timeline to Now. */
  resetKey: string;
}) {
  const scrollRef = useRef<ScrollView>(null);
  /** Scroll state lives in refs so panning never triggers a re-render. */
  const offsetRef = useRef(0);
  const maxOffsetRef = useRef(0);
  const dragOriginRef = useRef(0);
  const pinnedRight = useRef(true);
  const [width, widthRef, onWidthLayout] = useMeasuredWidth("global:timeline");
  const [hovered, setHovered] = useState<string | null>(null);

  const topHeight = compact ? 44 : 58;
  const bottomHeight = compact ? 22 : 30;
  const plotHeight = topHeight + 1 + bottomHeight;
  const gaps = Math.max(1, hours.length - 1);
  const slot = width > 0 ? width / VISIBLE_HOURS : 0;
  const contentWidth = slot > 0 ? gaps * slot : 0;
  const maxOffset = Math.max(0, contentWidth - width);
  maxOffsetRef.current = maxOffset;

  /**
   * Press-and-drag panning: the host's mouse users have no horizontal wheel and
   * the scrollbar is hidden. Claimed only once the gesture is clearly
   * horizontal, so hover and click on an hour still reach the hotspots.
   */
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dx) > 3 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderGrant: () => {
          dragOriginRef.current = offsetRef.current;
          // A drag steals the pointer from the hotspots; drop the stale cursor.
          setHovered(null);
        },
        onPanResponderMove: (_event, gesture) => {
          const target = Math.max(
            0,
            Math.min(maxOffsetRef.current, dragOriginRef.current - gesture.dx),
          );
          offsetRef.current = target;
          scrollRef.current?.scrollTo({ x: target, animated: false });
        },
        onPanResponderRelease: () => {
          pinnedRight.current = offsetRef.current >= maxOffsetRef.current - 2;
        },
      }),
    [],
  );

  useEffect(() => {
    pinnedRight.current = true;
    setHovered(null);
    scrollRef.current?.scrollToEnd({ animated: false });
  }, [resetKey]);

  const { messages, agents, messagePeak, agentPeak, total } = useMemo(() => {
    const messages = hours.map((hour) => hour.messages);
    const agents = hours.map((hour) => hour.agents);
    return {
      messages,
      agents,
      messagePeak: messages.reduce((peak, value) => Math.max(peak, value), 0),
      agentPeak: agents.reduce((peak, value) => Math.max(peak, value), 0),
      total: hours.reduce((sum, hour) => sum + hour.total, 0),
    };
  }, [hours]);

  /** Local midnights become axis ticks. */
  const dayTicks = useMemo(
    () =>
      hours.flatMap((hour, index) => {
        const date = new Date(hour.start);
        if (date.getHours() !== 0) return [];
        return [
          {
            index,
            label: date.toLocaleDateString(locale, { month: "short", day: "numeric" }),
          },
        ];
      }),
    [hours, locale],
  );

  const activeIndex = hours.findIndex((hour) => hour.key === hovered);
  const active = activeIndex >= 0 ? hours[activeIndex] : undefined;
  const readout = active
    ? `${hourRangeLabel(active.start, locale)} — ${active.agents} agents · ${active.messages} messages · ${active.skills} skills · ${active.mcp} MCP`
    : `Last ${hours.length} hours · ${total.toLocaleString(locale)} events · peak ${agentPeak} agents/h, ${messagePeak} messages/h`;

  const fill = mixColor(colors.surface2, colors.accent, 0.22);
  const agentStroke = mixColor(colors.surface2, colors.accent, 0.68);
  // Softened toward the surface so the hover cursor reads grey, not near-black.
  const cursorColor = mixColor(colors.surface2, colors.foregroundMuted, 0.55);

  // Stable element identity: hovering must not rebuild ~330 skewed segments.
  const series = useMemo(
    () => (
      <>
        <AreaSeries
          values={messages}
          max={messagePeak}
          height={topHeight}
          slot={slot}
          stroke={colors.accent}
          fill={fill}
        />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <AreaSeries
          values={agents}
          max={agentPeak}
          height={bottomHeight}
          slot={slot}
          stroke={agentStroke}
          fill={fill}
          flip
        />
      </>
    ),
    [
      messages,
      agents,
      messagePeak,
      agentPeak,
      topHeight,
      bottomHeight,
      slot,
      colors.accent,
      colors.border,
      fill,
      agentStroke,
    ],
  );

  const hotspots = useMemo(
    () => (
      <View
        // Clipped: the edge hotspots overhang by half a slot, and that overhang
        // would otherwise widen the scroll content past the last hour.
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: contentWidth,
          height: plotHeight,
          overflow: "hidden",
        }}
      >
        {hours.map((hour, index) => (
          <Pressable
            key={hour.key}
            focusable
            accessibilityLabel={`${hourRangeLabel(hour.start, locale)}: ${hour.agents} agents, ${hour.messages} messages, ${hour.skills} skills, ${hour.mcp} MCP`}
            onHoverIn={() => setHovered(hour.key)}
            onHoverOut={() => setHovered(null)}
            onFocus={() => setHovered(hour.key)}
            onBlur={() => setHovered(null)}
            style={{
              position: "absolute",
              left: Math.max(0, index * slot - slot / 2),
              top: 0,
              width: slot,
              height: plotHeight,
            }}
          />
        ))}
      </View>
    ),
    [hours, slot, contentWidth, plotHeight, locale],
  );

  return (
    <View
      ref={widthRef}
      style={{ gap: titleGap(compact) }}
      onLayout={onWidthLayout}
    >
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text style={{ ...sectionTitle(compact), color: colors.foreground }}>
          Timeline
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Text style={{ ...TEXT.meta, color: colors.accent }}>▲ messages</Text>
          <Text style={{ ...TEXT.meta, color: agentStroke }}>▼ agents</Text>
        </View>
      </View>

      {hours.length === 0 || slot === 0 ? (
        <View style={{ height: plotHeight, justifyContent: "center" }}>
          <Text style={{ ...TEXT.small, color: colors.foregroundMuted }}>
            {hours.length === 0 ? "No activity yet" : ""}
          </Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          {...pan.panHandlers}
          onScroll={(event) => {
            offsetRef.current = event.nativeEvent.contentOffset.x;
            pinnedRight.current = offsetRef.current >= maxOffset - 2;
          }}
          // Fires on mount and on every resize; keeps Now on screen unless the
          // user has scrolled into history.
          onContentSizeChange={() => {
            if (pinnedRight.current) scrollRef.current?.scrollToEnd({ animated: false });
          }}
        >
          <View style={{ width: contentWidth, paddingBottom: 2 }}>
            {series}

            {active ? (
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: Math.min(contentWidth - 1, activeIndex * slot),
                  top: 0,
                  width: 1,
                  height: plotHeight,
                  backgroundColor: cursorColor,
                }}
              />
            ) : null}

            {hotspots}

            <View style={{ height: 16, marginTop: 4 }}>
              {dayTicks
                .filter((tick) => tick.index * slot <= contentWidth - NOW_LABEL_CLEARANCE)
                .map((tick) => (
                  <View
                    key={tick.index}
                    style={{ position: "absolute", left: tick.index * slot, top: -4 }}
                  >
                    <View style={{ width: 1, height: 3, backgroundColor: colors.border }} />
                    <Text
                      numberOfLines={1}
                      style={{ ...TEXT.caption, color: colors.foregroundMuted, marginTop: 2 }}
                    >
                      {tick.label}
                    </Text>
                  </View>
                ))}
              <Text
                style={{
                  position: "absolute",
                  right: 0,
                  top: 1,
                  ...TEXT.caption,
                  color: colors.foregroundMuted,
                }}
              >
                Now
              </Text>
            </View>
          </View>
        </ScrollView>
      )}

      <Text
        accessibilityLiveRegion="polite"
        numberOfLines={1}
        style={{ ...TEXT.meta, color: colors.foregroundMuted }}
      >
        {readout}
      </Text>
    </View>
  );
}
