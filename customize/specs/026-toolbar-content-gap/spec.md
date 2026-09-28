# 026 — 操作栏与内容间距

## 目标

- 固定操作栏（Provider / Project / 分类 / 搜索等）与下方滚动内容之间增加固定间距，列表或卡片滚动到任意位置时内容都不再贴住操作栏。
- 间距沿用现有节奏 token（`titleGap(compact)` = 10 / 12），列表视图与卡片视图一致。

## 非目标

- 不改操作栏内部布局、换行规则与浮层（Provider / Project / 机制下拉）。
- 不改预览面板与其上边框。

## 验收

- 内容滚动到顶部或中间任意位置时，条目 / 卡片与操作栏底部之间始终保留 `titleGap(compact)` 的空白。
- 静止时首个 Project / User 节标题与操作栏的间距比原先增加 `titleGap(compact)`。
- 列表视图与卡片视图表现一致；`npm run typecheck`、`npm test` 通过。
