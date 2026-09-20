# 049 — Agent 生命周期：归档补扫 · 最长寿命 · 每日创建直方图

- 状态：已实现（§4.2 / §4.3 / §5 经 051 修订）
- 日期：2026-09-20
- 依赖：005（agent 注册表）、004（热力图 agents 口径）、008（静默补扫）、047（明确归档状态）
- 修订：[050](../050-kpi-insights-reorg/) 把直方图改为固定 30 天窗口、移除其页脚的最长寿命行，并把最长寿命上移到 KPI（G5 的展示位置以 050 为准）；[051](../051-creations-provider-stack/) 把直方图数据源换成 `usage.agent-creations`（按 provider 堆叠）、分桶收敛为固定 30 根日柱，并让最长寿命纳入仍活跃的 agent（§4.2 / §4.3 / §5 以 051 为准）

## 1. 背景

`agents.created_at` / `archived_at` 已落库，但两个生命周期指标都不可用：

1. **归档时间只有 live 钩子能写。** daemon `listAgentPayloads` 在 `filter.includeArchived !== true` 时把 `archivedAt` 非空的行整体过滤掉，插件的目录同步（`background-sync.check`）与 `resyncAgents` 都不带该 filter，因此「插件安装前 / 未观测期间」归档的 agent 永远补不到 `archived_at`。本机实测：宿主 `~/.paseo/agents/*.json` 有 483 个已归档 agent，本地库仅 164 条归档时间，11 条在库但 `archived_at` 为 NULL，308 条整行缺失。
2. **`ActivityDay.agents` 只有热力图 tooltip 在用**，没有日粒度可视化；Global 面也没有「最长存活 agent」。

## 2. 目标

| ID | 目标 |
|---|---|
| G1 | 目录同步改带 `includeArchived`：归档 agent 的注册表元数据（createdAt / archivedAt / title / provider / workspace / parent）可补扫 |
| G2 | 补扫**不**触发归档 agent 的 timeline 全量扫描（成本受控） |
| G3 | 新增 `usage.agent-lifetime`：返回寿命最长（创建→归档）的 agent，支持 provider 过滤 |
| G4 | Global 面新增 **Agent creations** 直方图：按本地日 / 周 / 月分桶展示创建数（窗口与分桶由 050 收敛为固定 30 天日柱） |
| G5 | 最长寿命在 Global 面可见（展示位置由 050 定为 KPI 的 Longest agent 格） |

## 3. 非目标

- 不补扫归档 agent 的 timeline（`tool_calls` / `user_messages` 不回填）
- 不做按时间窗过滤的「最长寿命」：窗口语义与「创建→归档」不匹配，该值固定为全时段
- 不在 Workspace / Agent 面新增寿命列
- 不改热力图着色公式与 Daily / Weekly / Cumulative 模式
- **不绕过宿主目录契约**：project 记录已删除的 agent 无法通过 `agents.list` 获取（见 4.4），插件不直接读 `~/.paseo/agents/*.json`

## 4. 行为

### 4.1 归档补扫（G1 / G2）

- `background-sync` 每 5 分钟的目录同步带 `filter: { includeArchived: true }`，分页取全（limit 200）
- 列出的**所有** entry 写注册表；仅 `archivedAt` 为空的 entry 进入 timeline 扫描循环，归档 entry 跳过（不写 checkpoint、不扫 timeline）
- 反归档：宿主返回 `archivedAt: null` → 本地 `archived_at` 清空（沿用既有 upsert 语义）
- 已归档 agent 的 `created_at` 取宿主真值（比 005 G3 的「最早工具调用」近似更准，upsert 保留更早值）

### 4.2 最长寿命（G3）

- `usage.agent-lifetime`（输入 `provider?`）从注册表取 `created_at` 非空、`archived_at` 为空或 `>= created_at` 的行
- 输出 `durationMs` 最大者；同值取 `createdAt` 更早者；无样本时 `longest = null`
- `sampleSize` = 参与比较的行数（UI 以 "Measured over N archived agents" 展示，说明指标基数）
- provider 过滤按 `normalizeProvider` 比较，与 Global provider chips 一致
- **051 修订**：`archived_at` 为空的活跃行以 `createdAt → now` 参与比较（输出 `archivedAt: null`），KPI 值追加 `· active`；`sampleSize` 因此含活跃行，原 "Measured over N archived agents" 文案已随 050 移除

### 4.3 直方图（G4 / G5）

- 数据源：`usage.activity-by-day` 的 `day.agents`（provider / 时间窗过滤由该 RPC 承担）
- 分桶：`buildAgentCreationHistogram` 支持 日（跨度 ≤ 31 天）/ 周（≤ 400 天）/ 月；桶内求和
- 区间：起点 = `from` 或序列最早日；终点 = 本地今天；空档补 0，保证无空洞
- 悬浮 / 聚焦显示桶区间与数量；每根柱有无障碍标签
- **050 修订**：Global 面固定传入最近 30 个本地日 → 恒为 30 根日柱，不随 range chips 变化；页脚的最长寿命行移除（改由 KPI 展示）
- **051 修订**：数据源改为 `usage.agent-creations`（注册表单表，带当日 provider 明细）；分桶函数改为 `buildAgentCreationBuckets`（只做日粒度零填充），粒度切换分支删除；柱按 provider 堆叠，悬浮显示 provider 明细浮层

### 4.4 残留覆盖缺口（宿主契约限制）

daemon 的 `collectFetchAgentsEntries` 对每个 agent 解析 project placement，解析不到（project 记录已删除 / workspace 未知）就整条丢弃 —— 与 `includeArchived` 无关。本机实测：宿主 498 条 agent 记录中，403 条可列出，45 条（9%）落在 4 个已删除 project 下，任何 `agents.list` 调用都拿不到。

后果：这些 agent 不进注册表（既无 `created_at` 也无 `archived_at`），最长寿命与直方图对它们不可见。插件不绕过该契约（不直接读宿主磁盘文件），由 `usage.agent-lifetime.sampleSize` 与 UI 的 "Measured over N archived agents" 显式暴露基数。

## 5. 契约

| 名称 | 位置 |
|---|---|
| `AgentLifetimeItemSchema` / `usageAgentLifetimeRpc` | `shared/usage.ts` |
| `pickLongestAgentLifetime(agents, { provider, now })` | `shared/usage.ts`（纯函数；051 起含活跃行） |
| `buildAgentCreationBuckets(days, { from, today })` / `rankCreationProviders(buckets)` | `shared/activity.ts`（纯函数；051 取代 `buildAgentCreationHistogram`） |
| `AgentCreationDaySchema` / `usageAgentCreationsRpc` / `aggregateAgentCreations` | `shared/usage.ts`（051） |
| `formatDuration(ms)` | `shared/format.ts` |

zod 为运行时真相源。

## 6. 验收（本机实测）

- 补扫：注册表 179 → 453 行，`archived_at` 非空 164 → 441；此前 11 条 NULL 归档时间中 4 条补齐（其余 7 条落在 4.4 的缺口内）
- `usage.agent-lifetime` 与 SQL `MAX(julianday(archived_at) - julianday(created_at))` 一致：`3713f5b2…`，14.2 天（此前因缺归档时间只有 11.6 天）
- 直方图：Today 桶 = SQL 当日创建数（43 = 43）；分桶能力在 31 / 400 天边界正确（050 后 Global 面固定 30 天日柱）
- 归档 entry 不进入 timeline 扫描：`directory sync` 日志显示 listed=403 (archived=398)，无归档 agent 的 scan
- `npm run typecheck` + `npm test`（185 通过）；reload 后 Global 面可见直方图与最长寿命
- **051 复验**：`npm test` 192 通过；直方图 30 桶 / 合计 421（2026-09-20 = 43）、窗口排名 Cursor 249 > OpenCode 103 > Codex 35 > Pi 27 > Claude 7；最长寿命 14.2 天、`sampleSize` 453（含活跃行）
