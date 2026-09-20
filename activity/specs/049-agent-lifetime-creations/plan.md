# 049 — Plan

## 1. 数据面

### 1.1 归档补扫

`server/background-sync.ts`

```ts
async function listAllAgents(paseo: PaseoApi) {
  return listAllAgentPages(async (cursor) => {
    const result = await paseo.agents.list({
      // 归档 agent 只在 includeArchived 下返回（daemon listAgentPayloads 过滤）。
      filter: { includeArchived: true },
      page: { limit: AGENT_LIST_PAGE_LIMIT, ...(cursor ? { cursor } : {}) },
    });
    return { entries: result.entries, pageInfo: result.pageInfo };
  });
}
```

`check()` 扫描循环加护栏：

```ts
for (const { agent } of listedEntries) {
  if (agent.archivedAt) continue;   // 注册表已写；timeline 不回填
  ...
}
```

每次同步输出一行覆盖日志（含归档条数与注册表规模），用于确认补扫是否生效：

```ts
console.log(`${LOG_PREFIX} directory sync listed=${listedEntries.length} (archived=… ) registry=${known.size}`);
```

要点：

- 归档 entry 仍参与 `liveIds`（checkpoint 修剪）与 `store.upsertAgents`，只是不扫 timeline
- `resyncAgents` 内部兜底 list 保持 active-only（它只被 `check()` 以显式 agentIds 调用；显式列表由 `check()` 传入）
- 宿主 entry 恒带 `archivedAt`（daemon `enrichAgentPayload`：`payload.archivedAt = storedRecord?.archivedAt ?? null`），故 `agentRowFromSnapshot` 的 `?? null` 语义安全，无需「缺字段保留」分支
- **无法补齐的 45 条**：daemon `collectFetchAgentsEntries` 对每个 agent 解析 project placement，解析不到就丢弃（project 记录已删/未知 workspace），与 `includeArchived` 无关；本机 498 条中 403 条可列出。详见 spec 4.4

### 1.2 最长寿命

`shared/usage.ts`：

```ts
export const AgentLifetimeItemSchema = z.object({
  agentId: z.string(),
  provider: z.string(),
  workspaceId: z.string().nullable(),
  title: z.string().nullable(),
  createdAt: z.string(),
  archivedAt: z.string(),
  durationMs: z.number().int().nonnegative(),
});

export const usageAgentLifetimeRpc = defineRpc({
  name: "usage.agent-lifetime",
  input: z.object({ provider: z.string().optional() }),
  output: z.object({
    longest: AgentLifetimeItemSchema.nullable(),
    sampleSize: z.number().int().nonnegative(),
  }),
});

export function pickLongestAgentLifetime(agents, { provider } = {}) { … }
```

`server/handlers.ts`：`createAgentLifetimeHandler(store)` → `pickLongestAgentLifetime(store.selectAgents({ provider }), { provider })`（SQLite 侧 provider 由 `agentMatchesFilter` 二次过滤）。

`index.server.ts`：注册 handler，并沿用其他查询 RPC 的 `background.request(context.paseo)` 触发。

## 2. UI 面

### 2.1 分桶纯函数

`shared/activity.ts`：

```ts
export type CreationGranularity = "day" | "week" | "month";
export type CreationBucket = { key: string; start: string; end: string; count: number };
export function buildAgentCreationHistogram(
  days: readonly ActivityDay[],
  options: { from?: string; today?: Date } = {},
): { granularity: CreationGranularity; buckets: CreationBucket[]; total: number };
```

- 起点：`from` 的本地日，否则序列最早日；终点：`today` 本地日
- 分桶阈值：跨度 ≤ 31 → day；≤ 400 → week（周日起始，与 `startOfWeekSunday` 一致）；否则 month
- 桶内求和；空桶 count = 0（连续柱状，不跳日期）

### 2.2 时长格式化

`shared/format.ts`：`formatDuration(ms)` → `<1 min` / `N min` / `N.N h` / `N.N days` / `N.N months`（纯函数，locale 无关）。

### 2.3 组件

`client/agent-creations.tsx`：`AgentCreations({ days, from, colors, compact, locale, lifetime, lifetimeLoading })`

```text
Agent creations                             14 agents
[9/20 · 40 agents]                       ← hover 行（默认显示峰值桶）
▁▃▅█▅▃▁▂▄▆▇█▆▄▂▁                             ← 柱体（零值 = surface2 2px 桩）
9/7                                    9/20   ← 首尾轴标签
Longest lifetime · all time   11.6 days · 更新 spec 文档
```

- 颜色：柱体 `mix(surface2, accent, level)` 复用热力图调色（`activityLevel` 分级），零值用 `surface2`
- 交互：`Pressable` + `onHoverIn` / `onFocus` 设置选中桶；顶部固定一行显示 `label · N agents`
- 无障碍：每柱 `accessibilityLabel = "${count} agents created ${bucketLabel}"`

`client/global-surface.tsx`：新增 `usageAgentLifetimeRpc` 查询（provider 过滤，15s 轮询，`keepPreviousData`），区块插在 `ActivityHeatmap` 之后、`columns` 之前。

## 3. 影响面

| 面 | 变化 |
|---|---|
| Global KPI Agents | 窗口内创建数把「已归档但此前不可见」的 agent 计入 → 数字上升且符合 005 G5 口径 |
| Global 热力图 | 强度含 agents，历史日更接近真值 |
| Workspace Agents | 归档行变多（此前安装前归档的 agent 完全不可见），Status 过滤 / 搜索已可收敛 |
| 子 agent 角标（041） | 归档 parent 关系补齐后计数更准 |
| 5 分钟目录同步 | 每轮多取 2–3 页（200/页）；不增加 timeline 请求 |

## 4. 风险

| 风险 | 处置 |
|---|---|
| 归档 agent 涌入 Workspace 列表影响可读性 | 属于数据真实化；筛选 / 搜索已具备，本次不加默认隐藏 |
| 注册表增大后 `usage.agents` 负载 | 行数 ≈ 宿主可列出 agent 数（本机 453），聚合仍为内存计算；已有翻页与缓存 |
| 已删 project 下的 agent 永久不可见（45 / 498） | 宿主目录契约限制；不绕过（不读宿主磁盘）；由 `sampleSize` 与 UI 文案暴露基数 |
| 补扫把 `archived_at` 写成 NULL（反归档） | 宿主语义如此（`enrichAgentPayload` 恒返回显式值），UI 由 047 的目录覆盖兜底 |
