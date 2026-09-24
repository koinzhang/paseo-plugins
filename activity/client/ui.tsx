import { Icon } from "@getpaseo/plugin/client/react-native";
import { useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  CHART_MOTION,
  CONTROL,
  FONT_WEIGHT,
  ICON_SIZE,
  RADIUS,
  TEXT,
  iconButton,
  sectionTitle,
  titleGap,
  tooltipSurface,
} from "./design-tokens.ts";
import { useMessages } from "./use-app-language.ts";
import { stepMetric, type ActivityMetric } from "../shared/activity.ts";

/**
 * Shared Activity UI building blocks (066). Styling comes from design tokens;
 * copy comes from `useMessages()`. Rules: `docs/design-system.md`.
 */

type TextColors = { foreground: string; foregroundMuted: string };

export function IconButton({
  icon,
  label,
  onPress,
  color,
  size = ICON_SIZE.action,
  disabled,
  expanded,
  hidden,
  busy,
  style,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  color: string;
  size?: number;
  disabled?: boolean;
  expanded?: boolean;
  /** Keeps layout but hides and disables the button (hover-reveal rows). */
  hidden?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
}): ReactNode {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled === true, expanded }}
      disabled={disabled || hidden}
      hitSlop={CONTROL.hitSlop}
      onPress={onPress}
      pointerEvents={hidden ? "none" : "auto"}
      style={[iconButton, hidden ? { opacity: 0 } : null, style]}
    >
      {busy ? (
        <ActivityIndicator size={size} color={color} style={{ width: size, height: size }} />
      ) : (
        <Icon name={icon} size={size} color={color} />
      )}
    </Pressable>
  );
}

/** Section title row; `children` are trailing actions (usually `IconButton`s). */
export function SectionHeader({
  title,
  colors,
  compact,
  children,
}: {
  title: string;
  colors: TextColors;
  compact?: boolean;
  children?: ReactNode;
}): ReactNode {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <Text style={{ ...sectionTitle(compact), color: colors.foreground, flexShrink: 1 }} numberOfLines={1}>
        {title}
      </Text>
      {children ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2, flexShrink: 0 }}>{children}</View>
      ) : null}
    </View>
  );
}

/** Section wrapper with the shared title → content gap. */
export function Section({ compact, children }: { compact?: boolean; children: ReactNode }): ReactNode {
  return <View style={{ gap: titleGap(compact) }}>{children}</View>;
}

export function LoadingState({ color }: { color: string }): ReactNode {
  return <ActivityIndicator color={color} />;
}

/** Error text plus Retry; `onRetry` should refetch every failed query. */
export function ErrorState({
  error,
  onRetry,
  colors,
}: {
  error: unknown;
  onRetry?: () => void;
  colors: { statusDanger: string; accent: string };
}): ReactNode {
  const m = useMessages();
  const detail = error instanceof Error ? error.message : error != null ? String(error) : "";
  return (
    <View style={{ gap: 4 }} accessibilityRole="alert">
      <Text style={{ ...TEXT.small, color: colors.statusDanger }}>
        {detail ? `${m.common.loadFailed}: ${detail}` : m.common.loadFailed}
      </Text>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={CONTROL.hitSlop}
          onPress={onRetry}
          style={{ alignSelf: "flex-start", paddingVertical: 2 }}
        >
          <Text style={{ ...TEXT.small, fontWeight: FONT_WEIGHT.medium, color: colors.accent }}>
            {m.common.retry}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Empty text inside a section / list / chart. */
export function InlineEmpty({ text, color }: { text: string; color: string }): ReactNode {
  return <Text style={{ ...TEXT.small, color }}>{text}</Text>;
}

/** Whole-page empty state (no data at all). */
export function PageEmpty({ title, hint, colors }: { title: string; hint?: string; colors: TextColors }): ReactNode {
  return (
    <View style={{ paddingVertical: 48, alignItems: "center", gap: 6 }}>
      <Text style={{ ...TEXT.display, color: colors.foreground }}>{title}</Text>
      {hint ? <Text style={{ ...TEXT.body, color: colors.foregroundMuted, textAlign: "center" }}>{hint}</Text> : null}
    </View>
  );
}

/**
 * Text tabs. `filter` = page filters (body 14, weight shift); `chart` = in-chart
 * modes (label 12, color only — same level as axis labels).
 */
export function TextTabs<T extends string>({
  options,
  value,
  onChange,
  colors,
  variant,
  gap,
}: {
  options: ReadonlyArray<{ id: T; label: string }>;
  value: T;
  onChange: (id: T) => void;
  colors: TextColors;
  variant: "filter" | "chart";
  gap: number;
}): ReactNode {
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap }}>
      {options.map((option) => {
        const active = option.id === value;
        const text =
          variant === "filter"
            ? { ...TEXT.body, fontWeight: active ? FONT_WEIGHT.semibold : FONT_WEIGHT.medium }
            : TEXT.meta;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.id)}
            style={{ paddingVertical: 6 }}
          >
            <Text style={{ ...text, color: active ? colors.foreground : colors.foregroundMuted }}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * `‹ Sessions ›` metric switch for Global chart headers (070): cycles
 * Sessions → Prompts → Skill calls → MCP calls.
 */
export function MetricStepper({
  value,
  onChange,
  colors,
}: {
  value: ActivityMetric;
  onChange: (metric: ActivityMetric) => void;
  colors: TextColors;
}): ReactNode {
  const m = useMessages().global;
  const slide = useRef(new Animated.Value(0)).current;
  const step = (direction: 1 | -1) => {
    onChange(stepMetric(value, direction));
    // The new label enters from the side of the pressed arrow.
    slide.setValue(direction);
    Animated.timing(slide, {
      toValue: 0,
      duration: CHART_MOTION.step,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <IconButton
        icon="ChevronLeft"
        label={m.previousMetric}
        onPress={() => step(-1)}
        color={colors.foregroundMuted}
      />
      <View style={{ minWidth: 84, overflow: "hidden" }}>
        <Animated.Text
          accessibilityLiveRegion="polite"
          style={{
            ...TEXT.body,
            color: colors.foregroundMuted,
            textAlign: "center",
            opacity: slide.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] }),
            transform: [
              {
                translateX: slide.interpolate({
                  inputRange: [-1, 1],
                  outputRange: [-CHART_MOTION.stepOffset, CHART_MOTION.stepOffset],
                }),
              },
            ],
          }}
          numberOfLines={1}
        >
          {m.metrics[value]}
        </Animated.Text>
      </View>
      <IconButton
        icon="ChevronRight"
        label={m.nextMetric}
        onPress={() => step(1)}
        color={colors.foregroundMuted}
      />
    </View>
  );
}

/** Trailing count in list rows. */
export function CountText({ value, color }: { value: number | string; color: string }): ReactNode {
  return <Text style={{ ...TEXT.count, color, minWidth: 24, textAlign: "right" }}>{value}</Text>;
}

export type ChartTooltipRow = { label: string; value: string; color?: string };

const TOOLTIP_GAP = 8;

/**
 * Floating chart tooltip, shared by the heatmap, creations histogram and
 * timeline. Positioned in the chart root: centered on `anchorX`, above
 * `anchorY`, clamped to `[0, containerWidth]`.
 */
export function ChartTooltip({
  anchorX,
  anchorY,
  containerWidth,
  title,
  rows,
  colors,
  clampTop = true,
}: {
  anchorX: number;
  anchorY: number;
  /** false = may rise above the chart root (over the section header). */
  clampTop?: boolean;
  containerWidth: number;
  title: string;
  rows: ReadonlyArray<ChartTooltipRow>;
  colors: TextColors & { surface2: string; border: string };
}): ReactNode {
  const [size, setSize] = useState({ width: 180, height: 60 });
  const left = Math.max(0, Math.min(anchorX - size.width / 2, containerWidth - size.width));
  const rawTop = anchorY - size.height - TOOLTIP_GAP;
  const top = clampTop ? Math.max(0, rawTop) : rawTop;
  return (
    <View
      pointerEvents="none"
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
      }}
      style={{
        position: "absolute",
        left,
        top,
        zIndex: 10,
        minWidth: 140,
        maxWidth: containerWidth > 0 ? containerWidth : undefined,
        gap: 4,
        ...tooltipSurface(colors),
      }}
    >
      <Text accessibilityLiveRegion="polite" style={{ ...TEXT.tooltip, fontWeight: FONT_WEIGHT.medium, color: colors.foreground }}>
        {title}
      </Text>
      {rows.map((row) => (
        <View key={row.label} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {row.color ? (
            <View style={{ width: 8, height: 8, borderRadius: RADIUS.swatch, backgroundColor: row.color }} />
          ) : null}
          <Text style={{ ...TEXT.tooltip, color: colors.foregroundMuted, flex: 1 }} numberOfLines={1}>
            {row.label}
          </Text>
          <Text style={{ ...TEXT.tooltip, color: colors.foreground, fontVariant: ["tabular-nums"] }}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}
