# 065 — Plan

## 1. Token 模块

`client/design-tokens.ts`（依赖 `react-native` 的 `Platform` 与类型）：

| 导出 | 内容 |
|---|---|
| `MONO` | 等宽字体（原 3 处重复定义） |
| `FONT_SIZE` / `FONT_WEIGHT` | 字号阶梯 / 字重 |
| `TEXT` | 无颜色的文本角色，组件 `{ ...TEXT.x, color }` |
| `sectionTitle(compact)` / `titleGap(compact)` | 节标题、标题 → 内容间距 |
| `pageLayout(kind, compact)` | `surface` / `panel` 的 padding 与 section gap |
| `ROW_PADDING` | `dense` 6 / `regular` 9 |
| `RADIUS` / `pillRadius(h)` | 圆角 |
| `ICON_SIZE` / `CONTROL` / `iconButton` | 图标、按钮、徽标尺寸 |
| `tooltipSurface(colors)` | 图表 tooltip 容器 |

`compact` 参数可选（默认 false），兼容图表组件的 `compact?: boolean`。

## 2. 接线

| 文件 | 改动 |
|---|---|
| `global-surface.tsx` | `pageLayout("surface")`；tab / 标题 / insights / 排行 / 空态 / 错误走 token；排行空态独立 `inlineEmpty` |
| `activity-heatmap.tsx` / `agent-creations.tsx` / `hourly-activity-timeline.tsx` | `sectionTitle` + `titleGap`；tooltip 用 `tooltipSurface`；空态 `TEXT.small`；轴 / 图例 `TEXT.meta` / `caption` |
| `usage-stats.tsx` | KPI `FONT_SIZE.metric` / `label`、`RADIUS.card` |
| `panel.tsx` | `pageLayout("panel")`；合并 `listSectionTitle` 进 `sectionTitle`；行 `ROW_PADDING.regular` |
| `usage-popover.tsx` / `attention-popover.tsx` | compact 标题；行对齐 `rowTitle` / `meta` / `count`、`ROW_PADDING.dense` |
| `workspace/panel.tsx` | `pageLayout("panel")`；新增 `section` 样式（`titleGap`）供 Rank / Terminals；分页按钮 `iconButton` |
| `workspace/*-section.tsx` / `agent-row.tsx` / `display-menu.tsx` | 图标 / hitSlop token；删除 `MENU_OPTION_ICON_SIZE` |

## 3. 守护

`client/design-tokens.test.ts` 逐行扫描 `client/**/*.tsx`，命中裸数值即失败；`shadowRadius`、计算值（`cellSize / 4`、`SPIN_SIZE / 2`）不受限。测试只读文件文本，不导入 `react-native`，可在 node test runner 下运行。
