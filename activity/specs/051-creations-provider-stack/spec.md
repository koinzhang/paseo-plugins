# 051 — 创建直方图按 provider 堆叠 · 最长寿命含活跃 agent

- 状态：已实现（页面像素验收待用户在应用内确认）
- 日期：2026-09-20
- 依赖：049（寿命 RPC / 直方图）、050（固定 30 天窗口、KPI 排布）、005（注册表）、016（provider 归一）
- 修订：049 §4.2 / §4.3 / §5、050 §4.1 第 2 格 / §4.3 / §5 的对应条目以本目录为准；直方图日柱外观经 [053](../053-kpi-and-bar-polish/)（段圆角）再经 [055](../055-creations-day-gradient/)（整块软渐变）修订；浮层行经 [056](../056-creations-tooltip-nonzero/) 只列当日非零 provider

## 1. 背景

050 之后 Global 面的「Agent creations」只有总量：单色日柱 + 一行文字读数，看不出**哪些 provider** 在创建 agent；数据源 `usage.activity-by-day` 是为热力图设计的（skills / MCP / agents / messages 四维合流），既不携带 provider 明细，也让直方图每次多查 tool_calls 与 user_messages。

同时 049 的「Longest agent」只统计 `created_at` 与 `archived_at` 都非空的归档行：仍在运行的 agent（本机 453 行中 12 行）完全不计入，一个开了两周还没归档的 agent 在 KPI 里不可见。

## 2. 目标

| ID | 目标 |
|---|---|
| G1 | 新增 `usage.agent-creations`：按本地日返回创建数 + **当日 provider 明细**（只读注册表，不带 tool_calls / messages） |
| G2 | 直方图每根柱按 provider 堆叠，颜色按 provider 稳定派生（同一 provider 跨日同色） |
| G3 | 悬浮 / 聚焦 / 点击柱显示浮层：当日有创建的 provider 行 + 当日日期（**056**：当日为 0 的系列不再列出） |
| G4 | 最长寿命纳入**仍活跃**的 agent（创建→现在），KPI 值追加 `· active` 标记 |
| G5 | 分桶收敛为固定 30 根日柱：删除日 / 周 / 月粒度切换（050 已固定窗口，粒度分支成为死代码） |
| G6 | `mcpServerColor` → `entityColor`：MCP 排名图标与 provider 堆叠共用同一套稳定派生色 |

## 3. 非目标

- 不恢复周 / 月分桶，也不给直方图加时间窗选项（仍固定 30 天，见 050 G3）
- 不在直方图内提供 provider 勾选；provider 过滤仍走页面顶部 chips（作用于 RPC 入参）
- 不改热力图、Most used skills / MCP / models 列表
- 不改注册表采集与归档补扫（049 T1 已落地）
- 不绕行 049 §4.4 的宿主契约缺口（已删 project 下的 agent 仍不可见）

## 4. 行为

### 4.1 `usage.agent-creations`（G1）

- 入参：`from?` / `to?`（ISO，按 `created_at` 比较）/ `provider?`（归一后比较，空串 = 全部）
- 出参：`{ days: [{ date, total, providers: [{ provider, label, count }] }] }`
  - `date` 为**本地**日历日 `YYYY-MM-DD`；无创建的日不出现（零填充由客户端做）
  - `providers` 按当日 count 降序、同值按 provider id 升序；`label` 用 `providerLabel`
- 数据源：`store.selectAgents(filter)`（注册表单表）；时间戳不可解析的行跳过

### 4.2 直方图（G2 / G3 / G5）

- 窗口：`fixedWindowFrom(30)` → 本地今天往前 29 天 00:00 起，恒 30 根日柱（含今天）
- 分桶：`buildAgentCreationBuckets(days, { from, today })` 零填充 `[from, today]`；越界日丢弃；`count>0` 的切片才保留
- 堆叠顺序与配色：`rankCreationProviders(buckets)` 给出窗口内 provider 排名（总量降序，同值按 id 升序），驱动配色与浮层行序；`stackCreationProviders` 按同一排名为每根柱生成自顶而下的色序——**窗口总量最大的系列贴底**，当日无创建的系列省略；配色优先级（`creationProviderColors`）：① 有品牌色的 provider 固定用品牌色（含榜首）② 榜首无品牌色时用主题 `accent` ③ 其余用 chart palette
- **055 修订**：日柱改为**单块**填充——多 provider 用 `to bottom` 软渐变（色序同上、停点按当日 count 加权），单 provider 纯色；整柱顶角 3px、底角直角（取代 051 硬堆叠段与 053 段圆角规则）
- 柱高：`max(2, round(当日总量 / 窗口峰值 * 图高))`（055；原按段累加）；当日 0 创建显示 2px 的 `surface2` 底槽（无圆角）
- 浮层：`hovered ?? selected`（悬浮 / 聚焦 / 点击切换），绝对定位于柱区上方 6px，水平按柱中心夹紧在图宽内；内容为当日有创建的 provider 的 `label: count` 行（**056**：与 `stackCreationProviders` 同序，省略当日 0）+ 底部日期；空槽日可仅显示日期；`accessibilityLiveRegion="polite"`
- 标题：`Agents`；窗口内为 0 时显示 `No agents created in the last 30 days`
- 每根柱有无障碍标签：`<日期>: N agents — <provider> <count>, …`

### 4.3 最长寿命含活跃 agent（G4）

- `pickLongestAgentLifetime` 对 `archived_at` 为空的行取 `createdAt → now`；`now` 可注入（测试用）
- 仍然跳过：`created_at` 不可解析、跨度 < 0（时间倒挂）、provider 不匹配
- `sampleSize` = 参与比较的行数（含活跃行）
- KPI：`buildActivityKpi({ longestAgent: { durationMs, active } | null })` → `active` 为真时值形如 `14.2 days · active`，归档样本保持纯时长；无样本 `—`

## 5. 契约

| 名称 | 位置 |
|---|---|
| `AgentCreationProviderSchema` / `AgentCreationDaySchema` / `usageAgentCreationsRpc` | `shared/usage.ts` |
| `aggregateAgentCreations(agents, { from, to, provider })` | `shared/usage.ts`（纯函数） |
| `pickLongestAgentLifetime(agents, { provider, now })`（含活跃行） | `shared/usage.ts`（纯函数） |
| `buildAgentCreationBuckets(days, { from, today })` | `shared/activity.ts`（纯函数） |
| `rankCreationProviders(buckets)` | `shared/activity.ts`（纯函数） |
| `stackCreationProviders(ranked, dayProviders)` | `shared/activity.ts`（纯函数；柱内顶→底段序） |
| `creationProviderColors(rankedIds, accent, scheme)` | `client/rank-color.ts`（榜首 accent，其余色板） |
| `entityColor(key, accent)` | `client/rank-color.ts` |
| `createAgentCreationsHandler(store)` | `server/handlers.ts` |

zod 为运行时真相源。删除：`buildAgentCreationHistogram`、`CreationGranularity`、`CreationBucket.start/end`、`mcpServerColor`。

## 6. 验收（本机实测）

- 单测：`shared/usage.test.ts`（`pickLongestAgentLifetime (049 / 051)`、`aggregateAgentCreations (051)`）、`shared/activity.test.ts`（`agent creation buckets (051)`）、`shared/insights.test.ts`（活跃标记）、`client/rank-color.test.ts`（`entityColor`）、`server/handlers-query.test.ts`（两个 handler）；`npm test` 192 通过、`npm run typecheck` 通过
- 实机（复制 `~/.paseo/plugin-data/activity/usage.db` 后走真实 handler 链）：30 桶、窗口合计 421；2026-09-20 = 43（Cursor 21 / OpenCode 16 / Codex 3 / Pi 3）；窗口排名 Cursor 249 > OpenCode 103 > Codex 35 > Pi 27 > Claude 7；`provider=codex` 时桶集合与总量随之收窄
- 最长寿命：`3713f5b2…` 14.2 天（归档）；`sampleSize` 453（含活跃行）；`provider=codex` 时取 codex 内最长
- 像素级验证受环境限制（Electron 无 CDP、无 react-native-web / react-dom 离线渲染），页面验收由用户在应用内完成；`paseo plugin reload activity-dev` 后 running
