# Plan

- Add `CHART_MOTION` to `client/design-tokens.ts` and document it in `docs/design-system.md` § 6.
- `RankingBars`: `AnimatedBar` holds an `Animated.Value` (percent, starts at 0) and runs `Animated.timing` to the target on change, interpolated to a `width` percentage (`useNativeDriver: false`, width is a layout prop). Rows are keyed by entry key, so the same bar survives re-sorting; a running animation is stopped and the next continues from the current value.
- `AgentCreations`: `DayBar` does the same for column `height`; buckets are keyed by date.
- `ActivityHeatmap`: one shared `reveal` value (0→1) drives each week column's opacity through a staggered, clamped interpolation (`columnSpan` window per column). The effect runs once the width is measured and again on `metric` / `mode` / `from`; after the first sweep completes, the start opacity becomes `refreshFloor`.
