# 084 — 按压反馈与动效修正

来源：emil-design-eng UI 审查。只修审查中优先级最高的三组问题；视觉数值与 081 的时长口径不动。

## 问题

1. **按压反馈缺失**：`IconButton`、列表行（Agents / Terminals / Skills 时间线 / 排行展开）、文本 tab、Provider 触发器按下时没有任何视觉变化。
2. **动画跑在 JS 线程**：`RunningIndicator` 转圈、`MetricStepper` 滑入、Activity Calendar 扫入、Hourly Activity 增长只动 transform / opacity，却都用了 `useNativeDriver: false`。
3. **退出动画用 ease-in**：排行 Show less 收起（`ranking-bars.tsx`）与 Explorer 搜索框关闭（`agents-section.tsx`）用 `Easing.in`，起步慢；收起 / 关闭应最快响应。

## 目标

- 紧凑控件按下：`PRESS.scale` 0.94 + `PRESS.opacity` 0.7；纯文本目标按下：`PRESS.textOpacity` 0.6；列表行按下：`surface2` 背景高亮。
- 只动 transform / opacity 的动画改用原生驱动；动布局属性（width / height / marginLeft）的动画保持 JS 驱动。
- 两处退出改用 ease-out，且收起 / 关闭时长短于展开 / 打开（`CHART_MOTION.discloseClose` 180 < `disclose` 250；搜索关闭 160 < 打开 220）。

## 非目标

- 不引入强曲线 token（`Easing.bezier(0.23, 1, 0.32, 1)`）与浮层入场动画（审查 row 6/7，另开 spec）。
- 不改 heatmap 选中格视觉、hover 动作淡入、`CHART_MOTION` 首次 reveal 时长（审查其余行）。
- 不动视觉数值（字号 / 间距 / 圆角 / 颜色）。

## 验收

- `client/` 内 `Easing.in(` 零命中；`useNativeDriver: false` 只剩动画布局属性的调用点。
- `PRESS` 常量集中在 `design-tokens.ts`；`docs/design-system.md` 记录按压反馈规则。
- `npm run typecheck`、`npm test` 通过；`paseo plugin reload activity` 后为 running。
