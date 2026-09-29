# 083 — Insights 与 Most used 标题栏对齐

## 问题

Global 底部两栏的标题文字样式、标题到列表的间距相同，但 Most used 标题栏带有 24px 的切换按钮，Insights 标题栏只有文字自然高度。右栏标题和首行因此更靠下，8 行可视列表的底部也随之错位。

## 目标

- Activity insights 与 Most used skills / MCP / models 的标题栏使用相同的最小高度，文字垂直居中。
- 并排显示时，两栏标题、首行和同等行数的列表底部对齐。
- 保持现有字号、行距、标题到内容间距，以及 082 的完整列表、滚动上限和切换行为。
- 只调整 Global 底部两栏，不改变其他 section 的标题栏。

## 验收

- 两栏标题区共享样式，以 `CONTROL.iconButton` 作为最小高度。
- 宽屏并排、compact 纵向布局均使用相同标题区规则。
- `npm run typecheck`、`npm test` 通过；本地 Activity 重载后为 running。
