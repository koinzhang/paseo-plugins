# 069 — Plan

## 筛选

- `client/global-surface.tsx`：删除 `range` state 与 `TextTabs` 时间 chips；`usage.by-provider` 只查一次（`{}`），heatmap 请求不带 `from`。`client/range.ts` 保留（`fixedWindowFrom` 仍供 30 天直方图用）。
- `client/provider-filter.ts`：`selectProviderOptions` 默认不截断（`limit = Infinity`），删除 `PROVIDER_FILTER_LIMIT`；排序与「选中项保留」逻辑不变。
- 新组件 `client/provider-dropdown.tsx`：触发器 `Provider: <label> ▾`（`ChevronDown`）；菜单为触发器下方绝对定位浮层（`RADIUS.overlay` / `surface1` / `border`），web 上全屏 `fixed` 透明 backdrop 点外部关闭；选项行带选中勾，超过 8 项时浮层内滚动。

## KPI / Insights（`shared/insights.ts`）

- `buildActivityKpi` 入参：`sessions` / `messages` / `days` / `longestStreak` / `providers`（已过滤）/ `allProviders`（占比分母）/ `providerFilter`。
- `topProviderValue` → `label · pct%`（分母 = `allProviders` 消息和）；`topModelValue` → `label · pct%`（分母 = 过滤后 model 消息和）；分母为 0 → `—`。
- `buildActivityInsights` 行序：Busiest day · Peak weekday · Workspaces · Skill calls · MCP calls · Messages per session · Longest session · Coding vs chat；新增入参 `longestSession`。

## 文案（`shared/i18n.ts`，en + zh-CN）

- 新增 `common.sessions`、`units.sessions`；`kpi.sessions` / `kpi.activeDays`；`insights.messagesPerSession` / `insights.longestSession` / `insights.peakWeekday`。
- `creations.title` → Sessions；`timeline.legendAgents` → `▼ sessions`；`global.emptyHint` 改 Sessions。
- 删除 `global.ranges`、`global.heatmapModes`；新增 `global.providerLabel`、`global.providerRanking`（标题 + 指标名 + 上/下一指标）。
- `units.agents` / `common.agents` 保留给 Workspace / Agent 层。

## 热力图

- `ActivityHeatmap` 的 `onModeChange` / `modeOptions` 改为可选，未传时不渲染 tabs；Global 固定 `mode="daily"`。

## Providers 排行（`client/provider-ranking.tsx`）

- 数据：`usage.by-provider` 全部 provider（不过滤），指标取 `agentCount` / `messageCount` / `skillCalls.exact + inferred` / `mcpCalls`，与 KPI / Insights 同口径。
- 布局：行 = 色块（`providerColor`，与创建直方图浮层一致）+ 名称（固定宽）+ 条（track `surface2`，fill `accent`，高 6，`pillRadius`）+ 右对齐数值；标题右侧 `ChevronLeft` / 指标名 / `ChevronRight`。
- 位置：Timeline 之后、Insights / 排行两栏之前。
