import type { PluginTheme } from "@getpaseo/plugin";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import type { AgentLive, AgentState } from "../shared/contracts.ts";
import { agentAttention, isAgentRunning } from "../shared/agent-status.ts";

const SPIN_SIZE = 10;
const SPIN_DURATION_MS = 800;
const BADGE_HEIGHT = 18;

/** Host-style running ring, same as Activity's Explorer rows. */
function RunningIndicator({ theme }: { theme: PluginTheme }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: SPIN_DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [spin]);
  return (
    <Animated.View
      style={{
        width: SPIN_SIZE,
        height: SPIN_SIZE,
        borderRadius: SPIN_SIZE / 2,
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderTopColor: theme.colors.accent,
        transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }],
      }}
    />
  );
}

/**
 * Activity's agent glyph: `BotOff` once archived or gone, otherwise a Bot tinted by
 * attention (error / permission / finished) with a spinner badge while it runs.
 */
export function AgentIcon({
  state,
  live,
  size,
  theme,
}: {
  state: AgentState | undefined;
  live: AgentLive | undefined;
  size: number;
  theme: PluginTheme;
}) {
  const c = theme.colors;
  const off = state === "archived" || state === "missing";
  const attention = off ? null : agentAttention(live);
  const color =
    attention === "error"
      ? c.statusDanger
      : attention === "permission"
        ? c.statusWarning
        : attention === "finished"
          ? c.statusSuccess
          : c.foregroundMuted;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Icon name={off ? "BotOff" : "Bot"} size={size} color={color} />
      {!off && isAgentRunning(live) ? (
        <View
          style={{
            position: "absolute",
            right: -4,
            bottom: -4,
            width: 13,
            height: 13,
            borderRadius: 6.5,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: c.surface0,
          }}
        >
          <RunningIndicator theme={theme} />
        </View>
      ) : null}
    </View>
  );
}

/** Pending permission pill shown at the end of the row. */
export function PermissionBadge({
  state,
  live,
  theme,
}: {
  state: AgentState | undefined;
  live: AgentLive | undefined;
  theme: PluginTheme;
}) {
  const count = state === "active" ? (live?.permissions ?? 0) : 0;
  if (count === 0) return null;
  const c = theme.colors;
  return (
    <View
      accessibilityLabel={count === 1 ? "1 pending permission" : `${count} pending permissions`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        height: BADGE_HEIGHT,
        paddingHorizontal: 5,
        borderRadius: BADGE_HEIGHT / 2,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.surface1,
        flexShrink: 0,
      }}
    >
      <Icon name="ShieldAlert" size={12} color={c.statusWarning} />
      {count > 1 ? (
        <Text style={{ fontSize: 11, fontWeight: "600", color: c.statusWarning, fontVariant: ["tabular-nums"] }}>
          {count}
        </Text>
      ) : null}
    </View>
  );
}
