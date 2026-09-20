# 051 — Plan

## 1. shared 层

### 1.1 `shared/usage.ts`

```ts
export const AgentCreationProviderSchema = z.object({ provider, label, count });
export const AgentCreationDaySchema = z.object({ date, total, providers: [AgentCreationProviderSchema] });

export const usageAgentCreationsRpc = defineRpc({
  name: "usage.agent-creations",
  input: z.object({ from: z.string().optional(), to: z.string().optional(), provider: z.string().optional() }),
  output: z.object({ days: z.array(AgentCreationDaySchema) }),
});

export function aggregateAgentCreations(
  agents: ReadonlyArray<{ provider: string; createdAt: string }>,
  options?: { from?: string; to?: string; provider?: string },
): AgentCreationDay[];
```

- 只依赖注册表字段；`localDayKey` 负责本地日，`normalizeProvider` / `providerLabel` 复用 016 的口径
- `AgentLifetimeItemSchema.archivedAt` 改为 `z.string().nullable()`（活跃行为 null）

```ts
export function pickLongestAgentLifetime(
  agents: ReadonlyArray<{ … createdAt: string; archivedAt?: string | null }>,
  options?: { provider?: string; now?: number },
): { longest: AgentLifetimeItem | null; sampleSize: number };
```

- 结束时间 = `archivedAt ?? now`；其余过滤与并列规则不变

### 1.2 `shared/activity.ts`

```ts
export type CreationProviderSlice = { provider: string; label: string; count: number };
export type CreationBucket = { key: string; count: number; providers: CreationProviderSlice[] };

export function buildAgentCreationBuckets(
  days: readonly AgentCreationDay[],
  options: { from: string; today?: Date },
): CreationBucket[];

export function rankCreationProviders(buckets: readonly CreationBucket[]): CreationProviderSlice[];
```

- 删除 `CreationGranularity` / `buildAgentCreationHistogram` / `start` / `end` / 31 / 400 天阈值 / `monthKey`（050 固定窗口后粒度分支已无调用者）
- `dayIndex` / `addDays` / `startOfLocalDay` / `toDayKey` 保留（日历与 streak 仍在用）

### 1.3 `shared/insights.ts`

```ts
buildActivityKpi(input: {
  …
  longestAgent: { durationMs: number; active: boolean } | null;
}): InsightRow[]
```

- 值 = `formatDuration(durationMs) + (active ? " · active" : "")`

## 2. server 层

- `createAgentCreationsHandler(store)`：`store.selectAgents({ provider, from, to })` → `aggregateAgentCreations`
- `index.server.ts` 注册 `usageAgentCreationsRpc`（同其它查询 RPC，先 `background.request` 再返回）

## 3. client 层

### 3.1 `client/rank-color.ts`

`mcpServerColor(server, accent)` → `entityColor(key, accent)`（同算法：accent 色相 + 键哈希 × 黄金角，饱和度 / 亮度夹紧）；调用点：Global rank 列表 MCP 图标、直方图 provider 段与浮层色块。

### 3.2 `client/agent-creations.tsx`

- props `{ days: AgentCreationDay[]; windowDays; colors; compact?; locale }`
- 派生：`buckets`（useMemo，依赖 `days` + `from`）→ `providers` 排名 → `colorByProvider` / 当日 `countByProvider`
- 状态：`hovered` / `selected`（`activeKey = hovered ?? selected`，与热力图一致）、`width`、`tooltipSize`；`days` / `from` 变化时清空选中
- 布局：`position: relative` 容器 → 柱行（`flexDirection: row`，`alignItems: flex-end`，`gap`，`height`）→ 浮层 `position: absolute`，`bottom: chartHeight + 6`，`left` 夹紧
- 轴标签：首桶本地 `MMM D` + `Today`

### 3.3 `client/global-surface.tsx`

```ts
const histogramQuery = useQuery({
  queryKey: ["activity", "agent-creations", "last30", providerFilter],
  queryFn: () => agentCreations({ from: fixedWindowFrom(CREATIONS_WINDOW_DAYS), provider: … }),
  refetchInterval: 15_000,
  placeholderData: keepPreviousData,
});
```

- `kpi.longestAgent = lifetimeQuery.data?.longest ? { durationMs, active: archivedAt == null } : null`

## 4. 影响面

| 面 | 变化 |
|---|---|
| Global 直方图 | 单色柱 → 按 provider 堆叠；文字读数 → 浮层卡片；数据源 `activity-by-day` → `agent-creations` |
| Global KPI | Longest agent 含活跃 agent，活跃时带 `· active` |
| 热力图 / Insights / Rank 列表 | 数值不变；MCP 图标取色函数改名 |
| 查询成本 | 直方图查询由「tool_calls + user_messages + agents 三表聚合」降为「agents 单表」 |

## 5. 风险

| 风险 | 处置 |
|---|---|
| 活跃 agent 使 Longest agent 随时间增长 | 值后加 `· active`，明确它不是终值；归档后自动变为终值 |
| provider 数量多时浮层过长 | 只列窗口内出现过的 provider（本机 5 个）；浮层不参与布局（absolute），不挤压图表 |
| 30 根柱在窄栏下的可读性 | 柱 `minWidth: 3`、`gap` 2/3；Global 面为宽栏（Workspace 面不放直方图，见 024 NG2） |
| 颜色相近的 provider 难以区分 | 色相按黄金角散开（`entityColor`），并保留浮层文字与无障碍标签 |
