# 006 — 用户发送对话次数（user messages）

- 状态：已实现，真机验收待完成
- 日期：2026-09-19
- 依赖：001（timeline 采集路径）、002/005（全局热力图与 KPI 扩展位）
- 关联：与 **005 Agents** 正交——消息 ≠ agent 创建

## 1. 背景与问题

全局 **Activity** 页已有：

- **Tools**：skill / MCP 调用密度（热力图着色）
- **Agents**：当日 / 窗内 **创建** 的 agent 数（005）

仍缺第三维：用户实际发了多少次对话。这与「建了多少 agent」无关——一个 agent 可有上百条 user message；也可创建后零发送。

ChatGPT / Codex Profile 类页面通常同时展示活动强度（消息或 token）与实体规模（agents / projects）。本插件在无可靠跨 provider token 的前提下，用 **user_message 条数** 作为对话强度代理。

## 2. 目标

| ID | 目标 |
|---|---|
| G1 | 自动采集 timeline 中的 `user_message`，幂等入库 |
| G2 | 支持 resync / canonical refetch 回填历史消息（含精确 `ts`） |
| G3 | 全局 KPI 增加 **Messages**（时间窗 + provider 筛选内的发送次数） |
| G4 | 热力图 / tooltip 增加 `messages`；着色含 messages（与 agents 一并计入 `total`） |
| G5 | Activity insights 可展示 Total messages / 峰值日 messages（与 agents 分列） |
| G6 | 存储决策明确：**SQLite 事件表**；timeline 仅作源（见 §5） |

## 3. 非目标

| ID | 非目标 | 说明 |
|---|---|---|
| NG1 | Token / cost | provider `session.usage` 未稳定暴露给普通插件；另案 |
| NG2 | 用 turn 数替代消息数 | `turn_ended` ≈ 一轮，但重试/取消/无 user_message 的 turn 会偏差；本版以 `user_message` 为准 |
| NG3 | 消息正文入库或展示 | 只存 id / 元数据 / 时间；不存 `text`（隐私与体积） |
| NG4 | 改 pill / agent panel 主语义 | pill 仍以 skill/MCP 为主；本版只扩展 **全局** surface（可选后续再挂本 agent 明细） |
| NG5 | ~~热力图改按 messages 着色~~ | **已撤销**：`total = skills+mcp+agents+messages` |
| NG6 | 每次打开页面扫全部 agent timeline 现算 | 禁止作为查询路径（见 §5） |
| NG7 | 统计 assistant_message / reasoning | 非「用户发送」 |

## 4. 定义与口径

### 4.1 什么算一次「用户发送」

- Timeline item：`type === "user_message"`
- 计数单位：一条 item = 1（幂等键见 plan）
- **不**因同一 turn 内多条 tool_call 而放大
- 无稳定标识的 live item 暂待 canonical 重扫再计入；避免快照下标和历史序号生成不同主键。
- 空文本 / 仅附件：若仍落为 `user_message` item，则计入（实现时以 timeline 是否出现该项为准）

### 4.2 与 Agents / Tools 的关系

```text
agents.created_at     → 热力图 agents / KPI Agents
user_messages.ts      → 热力图 messages / KPI Messages
tool_calls (skill/mcp)→ 热力图 skills、mcp、着色 total
```

筛选：同一套时间 range + provider（normalize）+ 可选 workspace。

### 4.3 Streak

- 仍以「当日 skill+MCP total > 0」为主（002/004）
- **可选后续**：另定义 message-streak；本版不改现有 streak，避免混口径

## 5. 存储决策：SQLite vs 对话历史现算

| 方案 | 做法 | 评价 |
|---|---|---|
| A. 每次查询现算 | `agents.list` + 各 agent `timeline.refetch` 数 `user_message` | 延迟高、易超时；archive 易丢；live 快照缺稳定按天 `ts` |
| B. **SQLite 事件表（采用）** | live `turn_ended` upsert + resync 回填 | 与 `tool_calls` / `agents` 一致；全局聚合 O(本地行)；可筛选 |
| C. 仅存按天汇总 | 无明细 | 无法按 agent/provider 重切、难纠偏 |

**结论：采用 B。** Timeline / 对话历史是 **采集与回填源**，不是查询源。

补充：

- jsonl 驱动时旁路 `user_messages.jsonl`（或同库 typed 行），与 agents 旁路一致
- 不把消息正文写入插件数据目录

## 6. 用户故事与验收

### US-1 全局看到发送次数

- Given 若干 agent 已有用户发送
- When 打开侧边栏 Activity 并选时间范围
- Then KPI 出现 Messages = 窗内 `user_messages` 行数
- And 与 Agents、Skills、MCP 分列，不互相覆盖

### US-2 热力图展示当日发送

- Given 某日有 3 条 user_message、0 skill
- When 查看 Daily 热力图并点选该日
- Then tooltip 含 `…, 3 messages …`
- And 格子着色仍可为 0（无 skill/MCP）

### US-3 新建发送即入库

- Given 插件 running
- When 用户在某 agent 发送一条消息且 turn 结束
- Then `user_messages` 增加至多 1 行（同 id 重复 turn_ended 不增行）

### US-4 历史回填

- Given 插件启用前已有对话
- When 执行 resync 或打开全局页触发的 sync 路径（与 agents sync 同类）
- Then 历史 `user_message` 按 canonical `timestamp` 入库；重复执行幂等

### US-5 Provider 筛选

- Given 多 provider 消息
- When provider ≠ All
- Then Messages / 热力图 messages 只计该 normalize provider

## 7. 契约摘要

- 扩展 `ActivityDay`：`messages: number`（非负）
- `usage.activity-by-day` 输出带 `messages`
- `usage.by-provider`（或并行字段）暴露窗内 `messageCount`（按 provider）；全局 KPI 可对 providers 求和或单独 RPC——实现见 plan
- Schema：`user_messages` 表——见 `contracts/schema.sql`

Zod（`shared/usage.ts`）为运行时真相源；本目录 contracts 保持同步。

## 8. 验收清单（实现后）

- [x] 单测：ingest user_message 幂等；按日聚合；provider 过滤
- [x] 单测：无 tool_call 仅有 user_message 的日仍出现在 activity days
- [x] `npm run typecheck` / `npm test`（76 项通过）
- [ ] reload 后：发一条新消息 → Messages KPI +1；热力图当日 messages +1
- [x] resync 不复制行（分页重复重扫测试）
