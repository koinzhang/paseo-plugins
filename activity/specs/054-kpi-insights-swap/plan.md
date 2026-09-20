# 054 — Plan

## 1. `shared/insights.ts`

- `peakWeekdayValue(days, locale)` 保持模块内私有（原样），改由 `buildActivityKpi` 调用（第 5 格，倒数第二）
- `buildActivityInsights` 第 3 行换成 `{ label: "Workspaces", value: formatCount(input.workspaces) }`
- 入参签名互换（见 spec §5）；`InsightSummary` 不变

## 2. `client/global-surface.tsx`

```ts
const insights = useMemo(() => buildActivityInsights({
  days: activityQuery.data?.days ?? [],
  summary: { … },
  workspaces: summary.workspaces,
  locale,
}), [activityQuery.data?.days, locale, summary]);

const kpi = useMemo(() => buildActivityKpi({
  agents: summary.agents,
  days: activityQuery.data?.days ?? [],
  locale,
  longestStreak: streaks.longest,
  longestAgent: …,
  providers: filteredProviders,
  providerFilter,
}), [activityQuery.data?.days, filteredProviders, lifetimeQuery.data, locale, providerFilter, streaks.longest, summary.agents]);
```

- 依赖数组同步：KPI 去掉 `summary.workspaces`、加 `activityQuery.data?.days` 与 `locale`

## 3. 影响面

| 面 | 变化 |
|---|---|
| Global KPI 第 3 格 | `Workspaces` → `Peak weekday`（值短，恒 18px） |
| Global Insights 第 3 行 | `Peak weekday` → `Workspaces` |
| 查询 / RPC | 不变（`usage.summary.workspaces` 与 `usage.activity-by-day.days` 都已在手） |
| Workspace / Agent 面 | 不受影响（各自 KPI 列表独立） |

## 4. 风险

| 风险 | 处置 |
|---|---|
| KPI 里出现「星期」是否与窗口口径混淆 | `Peak weekday` 一直按窗口内活跃日统计（010），与 `Longest streak`（全时段 streak 序列）并列在 KPI，均已在 050 说明为窗口值 |
| 忘记同步 `useMemo` 依赖导致不刷新 | 依赖数组已按新入参重写，并在 tasks 里作为验证项（typecheck + 浏览器实测数值） |
