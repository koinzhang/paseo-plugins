# 050 — Plan

## 1. shared 层

### 1.1 `shared/insights.ts`

```ts
export type InsightSummary = { skills; mcp; agents; messages; codingAgents?; chatAgents? };

/** 8 行：日历习惯 → 窗口体量 → 结构（050；054 起第 3 行为 Workspaces）。 */
export function buildActivityInsights(input: {
  days: readonly ActivityDay[];
  summary: InsightSummary;
  workspaces: number;
  locale?: string;
}): InsightRow[];

/** 6 格：top / longest 优先（050；051 起 longestAgent 含活跃标记；054 起第 3 格为 Peak weekday）。 */
export function buildActivityKpi(input: {
  agents: number;
  days: readonly ActivityDay[];
  locale?: string;
  longestStreak: number;
  longestAgent: { durationMs: number; active: boolean } | null;
  providers: readonly ProviderUsageItem[];
  providerFilter: string;
}): InsightRow[];
```

- `topProviderValue` 的 filtered 分支由「—」改为该 provider 名称（单 provider 下份额恒 100%，显示百分比无意义）
- `topModelValue` 行为不变（filtered 时在 provider 内排名）
- 删除 `InsightSummary.longestStreak` 与 `buildActivityInsights` 的 `providers` / `providerFilter` / `limit`
- `formatCount` / `formatDuration` 复用 `shared/format.ts`

### 1.2 `shared/format.ts`

新增 `formatCount(value)`（原 `global-surface.tsx` 内联实现上移，供 KPI 复用）。

## 2. client 层

### 2.1 `client/range.ts`

```ts
/** 固定窗口起点：本地今天往前 (days-1) 天的 00:00。 */
export function fixedWindowFrom(days: number, now?: Date): string;
```

### 2.2 `client/agent-creations.tsx`

- props 变为 `{ days, windowDays, colors, compact, locale }`：窗口由 `windowDays` 内部计算，不再接收 `from` / `lifetime`
- 标题右侧 `N agents · last 30 days`；移除页脚（Longest lifetime + Measured over）
- 组件只负责分桶与渲染；`buildAgentCreationHistogram` 保持通用（日/周/月分桶能力保留，固定 30 天下恒为日）
- **051 修订**：`days` 类型为 `AgentCreationDay[]`（带 provider 明细），分桶改用 `buildAgentCreationBuckets`；日/周/月粒度能力删除（固定 30 天下无调用者）

### 2.3 `client/global-surface.tsx`

```ts
const CREATIONS_WINDOW_DAYS = 30;

const histogramQuery = useQuery({
  queryKey: ["activity", "agent-creations", "last30", providerFilter], // 051 起用专用 RPC
  queryFn: () => agentCreations({ from: fixedWindowFrom(CREATIONS_WINDOW_DAYS), provider: … }),
  refetchInterval: 15_000,
  placeholderData: keepPreviousData,
});
```

- `kpi = buildActivityKpi({ agents, days, locale, longestStreak: streaks.longest, longestAgent: { durationMs, active } | null, providers: filteredProviders, providerFilter })`（051 起；054 起 `days` / `locale` 换入、`workspaces` 换出）
- `insights = buildActivityInsights({ days: activityQuery.data?.days ?? [], summary, workspaces: summary.workspaces, locale })`（054 起）
- 删除本地 `formatCount`

## 3. 影响面

| 面 | 变化 |
|---|---|
| Global KPI | 6 格换血：Messages / Skill calls / MCP calls / Current streak 移出；Top provider / Top model / Longest streak 上移 |
| Global Insights | 8 行重排；总量三行由 KPI 迁入 |
| 直方图 | 固定 30 天、恒 30 柱；不再随 range chips 抖动 |
| 热力图 / Rank 列表 | 不变 |
| 查询次数 | 多一个 `usage.activity-by-day`（固定窗口）每 15s；本地 SQLite，代价可忽略 |

## 4. 风险

| 风险 | 处置 |
|---|---|
| 直方图窗口与热力图窗口不一致，用户误以为同一时间轴 | 标题写明 `last 30 days`；轴标签为首尾日期 |
| KPI 的 Longest agent 为全时段、其余格为窗口内 | 049 已明确「寿命不按窗口过滤」；provider 过滤仍生效 |
| provider 过滤时 Top provider 无百分比 | 单 provider 下百分比恒 100%，显示名称更可读 |
