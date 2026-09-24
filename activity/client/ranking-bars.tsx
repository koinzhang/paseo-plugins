import { Icon } from "@getpaseo/plugin/client/react-native";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import { metricValue, type ActivityMetric } from "../shared/activity.ts";
import { messagesFor } from "../shared/i18n.ts";
import { CHART_MOTION, CONTROL, ICON_SIZE, RADIUS, ROW_PADDING, TEXT, pillRadius, sectionTitle, titleGap } from "./design-tokens.ts";
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
  /** Extra rows stay mounted until the collapse animation finishes. */
  const [extrasMounted, setExtrasMounted] = useState(false);
  const [disclosing, setDisclosing] = useState(false);
  const [extrasHeight, setExtrasHeight] = useState(0);
  const disclosure = useRef(new Animated.Value(0)).current;
  const m = messagesFor(locale);

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    setDisclosing(true);
    if (next) setExtrasMounted(true);
    discloseTiming(disclosure, next).start(({ finished }) => {
      if (!finished) return;
      setDisclosing(false);
      if (!next) setExtrasMounted(false);
    });
  }
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
  const toggleLabel = expanded ? m.global.ranking.showLess : m.global.ranking.showMore(hiddenCount);

  // Slots past `rows.length` linger until their exit animation reports back.
  const [lingering, setLingering] = useState(0);
  const slotCount = Math.max(lingering, rows.length);
  const rowCountRef = useRef(rows.length);
  rowCountRef.current = rows.length;
  // Rows only animate in once the list has been shown; first paint and the
  // Show more reveal already have their own motion.
  const listShownRef = useRef(false);
  const extrasShownRef = useRef(false);
  useEffect(() => {
    setLingering((prev) => (rows.length === 0 ? 0 : Math.max(prev, rows.length)));
    listShownRef.current = rows.length > 0;
  }, [rows.length]);
  useEffect(() => {
    extrasShownRef.current = extrasMounted;
  }, [extrasMounted]);
  const dropExited = () => setLingering(rowCountRef.current);
  const slots = (from: number, to: number, animateIn: boolean) =>
    Array.from({ length: Math.max(0, to - from) }, (_, index) => {
      const rank = from + index;
      return (
        <RankSlot key={rank} row={rows[rank]} animateIn={animateIn} onExited={dropExited}>
          {renderRow}
        </RankSlot>
      );
    });

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
          {slots(0, Math.min(VISIBLE_ROWS, slotCount), listShownRef.current)}
          {extrasMounted && slotCount > VISIBLE_ROWS ? (
            <Animated.View
              style={{
                height: disclosing
                  ? disclosure.interpolate({ inputRange: [0, 1], outputRange: [0, extrasHeight] })
                  : undefined,
                opacity: disclosure,
                overflow: "hidden",
              }}
            >
              <View
                style={{ gap: 2 }}
                onLayout={(event) => setExtrasHeight(event.nativeEvent.layout.height)}
              >
                {slots(VISIBLE_ROWS, slotCount, listShownRef.current && extrasShownRef.current)}
              </View>
            </Animated.View>
          ) : null}
          {hiddenCount > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={toggleLabel}
              accessibilityState={{ expanded }}
              hitSlop={CONTROL.hitSlop}
              onPress={toggle}
              style={{ alignSelf: "flex-end", flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: ROW_PADDING.dense }}
            >
              <Text style={{ ...TEXT.body, color: colors.foregroundMuted }}>{toggleLabel}</Text>
              <Animated.View
                style={{
                  transform: [{ rotate: disclosure.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] }) }],
                }}
              >
                <Icon name="ChevronDown" size={ICON_SIZE.inline} color={colors.foregroundMuted} />
              </Animated.View>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );

  function renderRow(row: RankedRow): ReactNode {
    return (
      <View
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
          <AnimatedBar
            percent={max > 0 ? Math.max(1, (row.value / max) * 100) : 0}
            color={colors.accent}
          />
        </View>
        <Text
          style={{ ...TEXT.body, color: colors.foregroundMuted, fontVariant: ["tabular-nums"], minWidth: 48, textAlign: "right" }}
        >
          {row.value.toLocaleString(locale)}
        </Text>
      </View>
    );
  }
}

type RankedRow = RankingEntry & { value: number };

function discloseTiming(value: Animated.Value, open: boolean): Animated.CompositeAnimation {
  return Animated.timing(value, {
    toValue: open ? 1 : 0,
    duration: CHART_MOTION.disclose,
    easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
    useNativeDriver: false,
  });
}

/**
 * One rank position. When its row appears or disappears (metric switch) it
 * opens / closes with the same height + opacity motion as Show more; a
 * departing row keeps rendering its last data until `onExited`.
 */
function RankSlot({ row, animateIn, onExited, children }: {
  row: RankedRow | undefined;
  animateIn: boolean;
  onExited: () => void;
  children: (row: RankedRow) => ReactNode;
}): ReactNode {
  const lastRow = useRef(row);
  if (row) lastRow.current = row;
  const present = row != null;
  const presence = useRef(new Animated.Value(animateIn ? 0 : 1)).current;
  const [animating, setAnimating] = useState(animateIn);
  const [height, setHeight] = useState(0);
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      if (!animateIn) return;
    }
    setAnimating(true);
    const animation = discloseTiming(presence, present);
    animation.start(({ finished }) => {
      if (!finished) return;
      // An exited slot stays clipped at 0 until the parent unmounts it.
      if (present) setAnimating(false);
      else onExited();
    });
    return () => animation.stop();
  }, [present]);

  const shown = lastRow.current;
  if (!shown) return null;
  return (
    <Animated.View
      style={{
        opacity: presence,
        height: animating ? presence.interpolate({ inputRange: [0, 1], outputRange: [0, height] }) : undefined,
        overflow: animating ? "hidden" : "visible",
      }}
    >
      <View onLayout={(event) => setHeight(event.nativeEvent.layout.height)}>{children(shown)}</View>
    </Animated.View>
  );
}

/**
 * Bar fill that grows from 0 on mount and animates between widths on change.
 * Slots are keyed by rank, so a bar only moves when its slot's percentage
 * changes, not when entries reorder under it.
 */
function AnimatedBar({ percent, color }: { percent: number; color: string }): ReactNode {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: percent,
      duration: CHART_MOTION.grow,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [percent, progress]);

  return (
    <Animated.View
      style={{
        width: progress.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }),
        height: BAR_HEIGHT,
        borderRadius: pillRadius(BAR_HEIGHT),
        backgroundColor: color,
      }}
    />
  );
}
