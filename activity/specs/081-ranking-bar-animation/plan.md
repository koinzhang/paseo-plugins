# Plan

- Add `CHART_MOTION` to `client/design-tokens.ts` and document it in `docs/design-system.md` § 6.
- `RankingBars`: `AnimatedBar` holds an `Animated.Value` (percent, starts at 0) and runs `Animated.timing` to the target on change, interpolated to a `width` percentage (`useNativeDriver: false`, width is a layout prop). Rows are keyed by rank index, so each slot keeps its `AnimatedBar` across re-sorting and only animates when its own percentage changes (label / swatch / count swap in place); a running animation is stopped and the next continues from the current value.
- `AgentCreations`: `DayBar` does the same for column `height`; buckets are keyed by date.
- `HourlyActivityTimeline`: one `grow` value (0→1) wraps `AreaSeries` in an `Animated.View` with `scaleY: grow` plus `translateY` from `plotHeight / 2` to 0 (RN scales around the center). It runs once data and width are ready, and again on `metric` / `resetKey` (provider); it stays inside the memoized `series` so hover does not rebuild it.
- `ActivityHeatmap`: one shared `reveal` value (0→1) drives each week column's opacity through a staggered, clamped interpolation (`columnSpan` window per column). The effect runs once the width is measured and again on `metric` / `mode` / `from`; after the first sweep completes, the start opacity becomes `refreshFloor`.
