# 021 — 短区间热力图与 All 同布局

- 状态：已实现
- 日期：2026-09-19
- 依赖：002（热力图）

## 1. 背景

`from`（Today / 7D / 30D）会缩短日历窗，周数变少、格子变大，与 All 的 52 周年窗样式不一致。

## 2. 目标

| ID | 目标 |
|---|---|
| G1 | `buildActivityCalendar` **始终**用固定 52 周年窗（同 All） |
| G2 | Today / 7D / 30D 仅通过查询过滤数据；窗外无数据的日子为空格，不改布局 |
| G3 | 月标签仍为 12 个均匀分布 |

## 3. 非目标

- 不改 Daily / Weekly / Cumulative 语义
- 不改 KPI / insights 的时间窗过滤

## 4. 验收

- [x] 任意 range 下 `weeks.length === 52`、`months.length === 12`
- [x] 短区间不再出现「整行只有一两周大方块」
- [x] `npm test` / typecheck 通过
