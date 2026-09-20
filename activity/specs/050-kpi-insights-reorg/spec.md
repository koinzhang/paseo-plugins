# 050 — Global KPI / Insights 重排 · 直方图固定窗口

- 状态：已实现
- 日期：2026-09-20
- 依赖：049（最长寿命 RPC、直方图）、011（Workspaces 口径）、010（streak）、016（provider 排名）、017（Insights 重排）
- 修订：[051](../051-creations-provider-stack/) 改了本目录的两处契约：§4.1 第 2 格（Longest agent 含活跃 agent，带 `· active`）、§4.3 与 §5（直方图数据源换成 `usage.agent-creations`，柱按 provider 堆叠；`buildAgentCreationHistogram` → `buildAgentCreationBuckets`）；[053](../053-kpi-and-bar-polish/) 去掉 §4.1 第 4/5 格的占比（只显示名称）；[054](../054-kpi-insights-swap/) 互换 §4.1 第 3 格与 §4.2 第 3 行（KPI 拿 Peak weekday，Insights 拿 Workspaces）

## 1. 背景

049 落地后 Global 面出现重复与错位：

- KPI 放的是 Messages / Agents / Workspaces / Skill calls / MCP calls / Current streak，而「Top provider / Top model / Longest streak」散在 Insights 里；用户想要的是 KPI 先给 Top / Longest。
- Insights 与 KPI 都有 streak 与总量口径，读起来分不清主次。
- 直方图跟着 range chips 走，切到 Today 只剩 1 根柱、切 All 又退化成周/月分桶；「每日创建数」这个指标反而看不出来。
- 直方图下方的 `Longest lifetime · all time` 与 KPI 的最长寿命重复。

## 2. 目标

| ID | 目标 |
|---|---|
| G1 | KPI 固定 6 格并优先 Top / Longest：Agents、Longest agent、Workspaces、Top provider、Top model、Longest streak |
| G2 | Insights 固定 8 行：Active days、Busiest day、Peak weekday、Messages、Skill calls、MCP calls、Messages per agent、Coding vs chat |
| G3 | 直方图固定 30 根日柱 = 最近 30 个本地日，不随 range chips 变化 |
| G4 | 移除直方图下方的 Longest lifetime 行（信息并入 KPI） |

## 3. 非目标

- 不改热力图（仍随 range chips）与 Most used skills / MCP / models 列表
- 不改 provider chips 的排名与上限（016）
- 不保留「Current streak」（KPI 只留 Longest streak）
- 不新增直方图的时间窗选项（固定 30 天）

## 4. 行为

### 4.1 KPI（6 格，顺序固定）

| 位置 | 指标 | 口径 |
|---|---|---|
| 1 | Agents | 窗口内创建数（005）；`formatCount` |
| 2 | Longest agent | `usage.agent-lifetime.durationMs`（全时段，provider 过滤生效）；`formatDuration`；无样本 `—`；**051**：活跃 agent 以创建→现在参与，值追加 `· active` |
| 3 | Top provider | 窗口内消息加权第一的 **provider 名称**（053 起不带占比）；provider 过滤时显示该 provider 名称 |
| 4 | Top model | 窗口内 model 消息数第一的**模型名**（053 起不带占比）；provider 过滤时在该 provider 内排名 |
| 5 | Peak weekday | 活跃日中 activityVolume 最大的星期（010；054 从 Insights 换入，置于倒数第二格） |
| 6 | Longest streak | 序列最长连续活跃天数（010） |

### 4.2 Insights（8 行，顺序固定）

`Active days` → `Busiest day` → `Workspaces`（054 从 KPI 换入）→ `Messages` → `Skill calls` → `MCP calls` → `Messages per agent` → `Coding vs chat`

- 计数（Messages / Skill calls / MCP calls）用 app locale 分组
- 移除 Longest streak / Top provider / Top model（已上移 KPI）
- 行数固定，不再接受 `limit` / `providers` / `providerFilter`

### 4.3 直方图（Agent creations）

- 窗口：本地今天往前 29 天 00:00 起（`fixedWindowFrom(30)`）→ 固定 30 根日柱，含今天
- 独立查询：`usage.activity-by-day` 带固定 `from`，与热力图的时间窗查询分离；provider 过滤仍生效
- 标题右侧：`N agents · last 30 days`；空窗口：`No agents created in the last 30 days`
- 移除页脚 `Longest lifetime · all time` 与 `Measured over N archived agents`
- **051 修订**：查询改为 `usage.agent-creations`（注册表单表 + 当日 provider 明细），柱按 provider 堆叠、悬浮显示 provider 明细浮层；窗口与 30 根日柱不变

## 5. 契约

| 名称 | 位置 |
|---|---|
| `buildActivityKpi(input) → InsightRow[]`（6 行） | `shared/insights.ts` |
| `buildActivityInsights(input) → InsightRow[]`（8 行） | `shared/insights.ts` |
| `fixedWindowFrom(days, now?) → ISO` | `client/range.ts` |
| `formatCount(value) → string` | `shared/format.ts` |
| `buildAgentCreationBuckets` / `rankCreationProviders` / `usageAgentCreationsRpc`（051 取代原 `buildAgentCreationHistogram` + `usage.activity-by-day` 数据源） | `shared/activity.ts` / `shared/usage.ts` |

## 6. 验收

- KPI 顺序：Agents / Longest agent / Workspaces / Top provider / Top model / Longest streak
- Insights 顺序：Active days / Busiest day / Peak weekday / Messages / Skill calls / MCP calls / Messages per agent / Coding vs chat
- 切换 Today / 7D / 30D / All time，直方图恒为 30 根柱且数值不变；切换 provider 时变化
- 直方图下方不再有 Longest lifetime 行
- `npm run typecheck` + `npm test` 通过
