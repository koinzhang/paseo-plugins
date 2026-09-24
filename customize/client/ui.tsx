import { Icon } from "@getpaseo/plugin/client/react-native";
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import type { Status } from "../shared/contracts.ts";
import { CONTROL, FONT_WEIGHT, ICON_SIZE, RADIUS, TEXT, iconButton, pillRadius, sectionTitle } from "./design-tokens.ts";
import { useMessages } from "./use-app-language.ts";

/** Shared building blocks, mirroring `activity/client/ui.tsx`. */

export type Colors = {
  surface0: string;
  surface1: string;
  surface2: string;
  border: string;
  foreground: string;
  foregroundMuted: string;
  accent: string;
  accentForeground: string;
  statusSuccess: string;
  statusWarning: string;
  statusDanger: string;
};

export function IconButton({
  icon,
  label,
  onPress,
  color,
  size = ICON_SIZE.action,
  disabled,
  busy,
  style,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  color: string;
  size?: number;
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
}): ReactNode {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled === true }}
      disabled={disabled}
      hitSlop={CONTROL.hitSlop}
      onPress={onPress}
      style={[iconButton, disabled ? { opacity: 0.4 } : null, style]}
    >
      {busy ? (
        <ActivityIndicator size={size} color={color} style={{ width: size, height: size }} />
      ) : (
        <Icon name={icon} size={size} color={color} />
      )}
    </Pressable>
  );
}

/** Text button with a leading icon (preview actions). */
export function TextButton({
  icon,
  label,
  onPress,
  colors,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  colors: Pick<Colors, "foregroundMuted" | "foreground" | "surface2">;
}): ReactNode {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={CONTROL.hitSlop}
      onPress={onPress}
      style={({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingVertical: 3,
        paddingHorizontal: 6,
        borderRadius: RADIUS.control,
        backgroundColor: hovered || pressed ? colors.surface2 : "transparent",
      })}
    >
      <Icon name={icon} size={ICON_SIZE.inline} color={colors.foregroundMuted} />
      <Text style={{ ...TEXT.meta, fontWeight: FONT_WEIGHT.medium, color: colors.foreground }}>{label}</Text>
    </Pressable>
  );
}

export function SectionHeader({
  title,
  count,
  colors,
  compact,
  children,
}: {
  title: string;
  count?: number;
  colors: Pick<Colors, "foreground" | "foregroundMuted">;
  compact?: boolean;
  children?: ReactNode;
}): ReactNode {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, flexShrink: 1 }}>
        <Text style={{ ...sectionTitle(compact), color: colors.foreground }} numberOfLines={1}>
          {title}
        </Text>
        {count != null ? <Text style={{ ...TEXT.count, color: colors.foregroundMuted }}>{count}</Text> : null}
      </View>
      {children ? <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>{children}</View> : null}
    </View>
  );
}

export function LoadingState({ color }: { color: string }): ReactNode {
  return <ActivityIndicator color={color} style={{ paddingVertical: 24 }} />;
}

export function ErrorState({
  error,
  onRetry,
  colors,
}: {
  error: unknown;
  onRetry?: () => void;
  colors: Pick<Colors, "statusDanger" | "accent">;
}): ReactNode {
  const m = useMessages();
  const detail = error instanceof Error ? error.message : error != null ? String(error) : "";
  return (
    <View style={{ gap: 4 }} accessibilityRole="alert">
      <Text style={{ ...TEXT.small, color: colors.statusDanger }}>{detail ? `${m.loadFailed}: ${detail}` : m.loadFailed}</Text>
      {onRetry ? (
        <Pressable accessibilityRole="button" hitSlop={CONTROL.hitSlop} onPress={onRetry} style={{ alignSelf: "flex-start", paddingVertical: 2 }}>
          <Text style={{ ...TEXT.small, fontWeight: FONT_WEIGHT.medium, color: colors.accent }}>{m.retry}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function InlineEmpty({ text, color }: { text: string; color: string }): ReactNode {
  return <Text style={{ ...TEXT.small, color }}>{text}</Text>;
}

/** Page filter tabs (Activity `TextTabs` `filter` variant) with trailing counts. */
export function CategoryTabs<T extends string>({
  options,
  value,
  onChange,
  colors,
}: {
  options: ReadonlyArray<{ id: T; label: string; count?: number; muted?: boolean }>;
  value: T;
  onChange: (id: T) => void;
  colors: Pick<Colors, "foreground" | "foregroundMuted">;
}): ReactNode {
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 18 }}>
      {options.map((option) => {
        const active = option.id === value;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.id)}
            style={{ flexDirection: "row", alignItems: "baseline", gap: 6, paddingVertical: 6 }}
          >
            <Text
              style={{
                ...TEXT.body,
                fontWeight: active ? FONT_WEIGHT.semibold : FONT_WEIGHT.medium,
                color: active ? colors.foreground : colors.foregroundMuted,
              }}
            >
              {option.label}
            </Text>
            {option.count != null ? (
              <Text style={{ ...TEXT.count, color: colors.foregroundMuted, opacity: option.muted ? 0.6 : 1 }}>{option.count}</Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function statusColor(status: Status, colors: Colors): string {
  switch (status) {
    case "auto":
      return colors.statusSuccess;
    case "conditional":
      return colors.accent;
    case "manual":
    case "pending":
      return colors.statusWarning;
    case "disabled":
      return colors.statusDanger;
    case "inactive":
      return colors.foregroundMuted;
  }
}

/** Outlined status pill: `CONTROL.pillBadgeHeight`, status color text and border. */
export function StatusBadge({ status, label, colors }: { status: Status; label: string; colors: Colors }): ReactNode {
  const color = statusColor(status, colors);
  return (
    <View
      style={{
        height: CONTROL.pillBadgeHeight,
        paddingHorizontal: 7,
        borderRadius: pillRadius(CONTROL.pillBadgeHeight),
        borderWidth: 1,
        borderColor: color,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Text style={{ ...TEXT.pillBadge, color }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
