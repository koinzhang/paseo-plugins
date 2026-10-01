# 085 — Hourly Activity 指标切换退出动画

## 目标

切换 Sessions / Prompts / Skill calls / MCP calls 时，旧折线与填充先向下收回基线，再显示新指标的向上展开动画。

## 行为与验收

- 旧指标保留至退出动画完成；沿现有入场动画的反方向缩放（`scaleY` 从当前值降至 0），基线固定。
- 退出复用 `CHART_MOTION.discloseClose`（180ms）与 ease-out；新指标复用 `CHART_MOTION.refresh`（450ms）入场。
- 连续切换取消过期动画与回调，以最后选择的指标为准；切回仍显示的指标时从当前高度恢复。
- 首次展示、provider 切换、后台刷新、横向拖动、坐标轴与 tooltip 内容保持原有行为。
- `npm run typecheck`、`npm test` 通过，重载后 Activity 为 running。

## 非目标

不调整其他图表动画、统计口径、指标切换按钮或版本号。
