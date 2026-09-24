# 070 — Plan

## 指标

- `shared/activity.ts`：`ActivityMetric`、`ACTIVITY_METRICS`、`metricValue`（sessions = `agents`、prompts = `messages`）、`stepMetric`、`buildDailyMetricBuckets`（沿用 `buildAgentCreationBuckets` 的窗口，providers 为空）。
- `client/ui.tsx`：`MetricStepper`（`ChevronLeft` / 指标名 / `ChevronRight`），文案 `global.metrics` / `previousMetric` / `nextMetric`。
- `client/ranking-bars.tsx`：069 的 `ProviderRanking` 泛化为 `RankingBars`（entries 自带 key / label / color / 四项值），Providers 与 Projects 共用；删除 `provider-ranking.tsx`。
- 热力图 / 直方图 / Timeline 各自持有 `metric` state，默认 `sessions`。直方图新增 `activityDays` prop（复用页面已有的 `usage.activity-by-day` 全时段查询，不加请求）。

## KPI / 文案

- `buildActivityKpi` 删 `longestStreak` 入参与第 6 格；Global 不再计算 streak。
- i18n：`common.prompts`、`units.prompts`、`kpi.prompts`、`insights.promptsPerSession`；删 `timeline.legend*`；`creations.title` → Last 30 days；sort / show 的 `messages` 值文案改 Prompts，`show.prompt` → Latest prompt。

## Projects 数据

- `agents` 表新增 `cwd`、`project_root`（`ensureAgentProjectColumns` ALTER；UPSERT 用 COALESCE 保留旧值；JSONL 驱动经 `mergeAgentRow`）。
- 写入：`agentRowFromHook` 带 `cwd`；后台目录同步额外分页 `paseo.workspaces.list()` 得到活跃 workspace → `projectRootPath`，传给 `agentRowFromSnapshot`（失败只记日志）。
- RPC `usage.by-project`（`{ provider? }` → `{ projects: [{ key, label, agentCount, messageCount, skillCalls, mcpCalls }] }`）：handler 调 `context.paseo.projects.list()` 取名称与 root，`aggregateByProject` 聚合；skill 计 exact + inferred（与 provider KPI 同口径）。Other 的 `label` 为空，由客户端本地化。
- 客户端：Projects 色块用 `entityColor(root)`，Other 用 `foregroundMuted`。
