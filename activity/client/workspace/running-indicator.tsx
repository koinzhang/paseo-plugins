import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, type ViewStyle } from "react-native";
import type { WorkspaceTheme } from "./constants.ts";

const SPIN_SIZE = 10;
const SPIN_DURATION_MS = 800;

/** Host-style running ring: border-colored track with an accent arc, rotating. */
export function RunningIndicator({
  theme,
  style,
}: {
  theme: WorkspaceTheme;
  style?: ViewStyle;
}): ReactNode {
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
      style={[
        {
          width: SPIN_SIZE,
          height: SPIN_SIZE,
          borderRadius: SPIN_SIZE / 2,
          borderWidth: 2,
          borderColor: theme.colors.border,
          borderTopColor: theme.colors.accent,
          transform: [
            {
              rotate: spin.interpolate({
                inputRange: [0, 1],
                outputRange: ["0deg", "360deg"],
              }),
            },
          ],
        },
        style,
      ]}
    />
  );
}
