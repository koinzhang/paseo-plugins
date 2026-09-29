# Plan

在 `client/global-surface.tsx` 中增加两栏共用的 `columnHeader` 样式：

- `minHeight: CONTROL.iconButton` 为无按钮的 Insights 预留同等高度。
- `justifyContent: "center"` 让两栏标题文字在标题区内垂直居中。
- 保留 `marginBottom: titleGap(compact) - ROW_GAP`，与列表容器的 `ROW_GAP` 相加仍为原来的 10 / 12px。
- Insights 和 `RankList` 标题外层都复用此样式；不修改公共 `SectionHeader`，避免影响其他视图。
