# 080 — Insights：Longest streak / Peak weekday 前移

## 背景

Global Activity insights 固定 8 行（072）。`Longest streak` / `Peak weekday` 属习惯类指标，目前排在第 5 / 6 位，被 `Workspaces`、`Coding vs chat` 隔开；习惯类指标应连在一起并更靠前。

## 目标

`Longest streak`、`Peak weekday` 两行移到第 3、4 位，位于 `Workspaces` 上方：

| # | 指标 |
|---|---|
| 1 | Active days |
| 2 | Busiest day |
| 3 | Longest streak |
| 4 | Peak weekday |
| 5 | Workspaces |
| 6 | Coding vs chat |
| 7 | Multi-turn sessions |
| 8 | Avg session duration |

行数、口径、文案、数据源均不变。

## 非目标

- 不改指标口径 / RPC / i18n 文案。
- 不改 KPI、图表、排行。

## 验收

- Global insights 顺序符合上表：`Longest streak` 紧接 `Busiest day`，其下 `Peak weekday`，再下 `Workspaces`。
- `shared/insights.test.ts` 顺序断言更新后 `npm test` / `npm run typecheck` 通过。
