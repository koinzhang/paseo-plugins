# 054 — KPI `Workspaces` ↔ Insights `Peak weekday` 互换

- 状态：已实现
- 日期：2026-09-20
- 依赖：050（KPI 6 格 / Insights 8 行）、010（Peak weekday 口径）、011（Workspaces 口径）

## 1. 背景

050 把 `Workspaces` 放在 KPI 第 3 格、`Peak weekday` 放在 Insights 第 3 行。实际读起来反了：

- `Peak weekday` 是「习惯」类结论（哪一天最忙），和 KPI 里已有的 `Longest streak` 同类，放在 KPI 更成组；值很短（`Mon`），在 130px 的格子里不触发 052 的缩字号。
- `Workspaces` 是窗口体量计数，和 Insights 里的 `Messages` / `Skill calls` / `MCP calls` 同类，放在 Insights 更成组。

## 2. 目标

| ID | 目标 |
|---|---|
| G1 | KPI 收入 `Peak weekday`，置于**倒数第二格**（第 5 格，`Longest streak` 之前）；值取活跃日中 `activityVolume` 最大的星期（010 口径不变） |
| G2 | Insights 第 3 行改为 `Workspaces`，值取窗口内 agents 去重 workspace 数（011 口径不变） |
| G3 | 两个指标的**计算与文案完全复用**，不新增 RPC / 查询 |
| G4 | 格数 / 行数不变（KPI 6 格、Insights 8 行） |

## 3. 非目标

- 不改其它格 / 行（Agents、Longest agent、Top provider、Top model、Longest streak；Active days、Busiest day、Messages、Skill calls、MCP calls、Messages per agent、Coding vs chat）
- 不改 `usage.summary.workspaces` 的来源（`query.data.totals.workspaceCount`，011）
- 不改 Peak weekday 的算法与 `—` 回退（无活跃日）
- 不新增数据面契约（纯参数搬家）

## 4. 行为

- 最终顺序 —— KPI：`Agents` → `Longest agent` → `Top provider` → `Top model` → `Peak weekday` → `Longest streak`；Insights：`Active days` → `Busiest day` → `Workspaces` → `Messages` → `Skill calls` → `MCP calls` → `Messages per agent` → `Coding vs chat`
- `buildActivityKpi` 入参：`workspaces` 换成 `days` + `locale?`；`Peak weekday` 作为第 5 格（倒数第二）输出
- `buildActivityInsights` 入参：新增 `workspaces: number`；第 3 行 = `Workspaces` / `formatCount(workspaces)`
- `client/global-surface.tsx`：`summary.workspaces` 从 KPI 调用移到 Insights 调用；`activityQuery.data?.days` 与 `locale` 从 Insights 移到 KPI（Insights 仍需要 `days` 算 Active days / Busiest day）

## 5. 契约

| 名称 | 位置 |
|---|---|
| `buildActivityKpi({ agents, days, locale?, longestStreak, longestAgent, providers, providerFilter })` | `shared/insights.ts` |
| `buildActivityInsights({ days, summary, workspaces, locale? })` | `shared/insights.ts` |

## 6. 验收

- 单测：`shared/insights.test.ts` —— Insights 行序含 `Workspaces`（值 = 入参）且不再有 `Peak weekday`；KPI 格序为 `Agents / Longest agent / Top provider / Top model / Peak weekday / Longest streak`（`Mon` / `Sun`，空 `days` → `—`）
- `npm run typecheck` + `npm test`：198 通过（干净副本 + lock 的 `0.9.0-beta.2` 依赖）
- 浏览器实测（react-native-web 渲染真实 `UsageStats` 与真实 builder 输出）：
  - KPI 6 格 = Agents `453` / Longest agent `14.2 days · active`(12.4px) / Top provider `Cursor` / Top model `Auto Smart` / **Peak weekday `Sat`** / Longest streak `8 days`，全部单行无截断
  - Insights 8 行 = Active days `7` / Busiest day `Sep 19 · 61 messages` / **Workspaces `83`** / Messages `259` / Skill calls `42` / MCP calls `20` / Messages per agent `0.6` / Coding vs chat `61% coding`
