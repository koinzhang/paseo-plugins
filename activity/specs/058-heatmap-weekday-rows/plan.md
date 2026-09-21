# 058 — plan

## 1. `shared/activity.ts`

`buildActivityCalendar` 只改窗口起点：

```ts
const start = addDays(startOfWeekSunday(end), -(51 * 7));
```

- 复用已有的 `startOfWeekSunday`（weekly 汇总本来就用它），列起点与自然周起点自动一致
- 外层 `for (cursor = start; cursor <= end; cursor += 7)`：末列 cursor = 本周周日 ≤ today，恰好 52 列
- `future = date > end` 重新变为有效分支；`excluded` 保持恒 false
- 仍用本地日历 `setDate` 加减，夏令时不会重复 / 漏日
- 月份轴、cumulative 前置历史、`_from` 兼容参数都不动

## 2. `client/activity-heatmap.tsx`

无需改动：

- `hidden = cell.future || cell.excluded` → `opacity: 0`，末列尾部自然留白
- tooltip 锚点 `Math.floor(i / 7)` 列、`i % 7` 行仍成立（每列恒 7 格）

## 3. 测试

`shared/activity.test.ts`：

- 把 048 的「364 连续可见日」断言换成 weekday 对齐断言（行索引 === `getDay()`）
- 断言可见格连续且以今天结尾，数量 = 364 −（6 − today.getDay()）
- 末列断言改为「首格 = 本周周日」，并校验 weekly 取值仍是自然周汇总
- cumulative 末格索引由 363 改为 `51 * 7 + today.getDay()`

## 4. 风险

| 风险 | 缓解 |
|---|---|
| 今天是周日时末列只有 1 格（048 想避免的形态） | spec §5 记录为既定取舍；与 GitHub / Codex 一致 |
| 可见日期数随 weekday 变化，KPI / streak 口径被误解 | KPI / insights 走自己的 range 查询，不读日历窗口 |
