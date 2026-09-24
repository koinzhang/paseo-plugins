# Plan

Add a five-row display limit and local expansion state to the shared `RankingBars` component. Keep sorting and filtering on the full result, then slice only the rendered rows while collapsed. Put the toggle at the right edge below the bars and use the metric switcher's `foregroundMuted` label color. Add translated expand/collapse labels to the shared message catalog. Because Global renders Providers and Projects as separate component instances, each has independent state.
