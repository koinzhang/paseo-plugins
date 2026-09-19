# 006 — Plan（HOW）

## 1. 架构

```text
agent.turn_ended.timeline[]
        │
        ├─ type===tool_call  → tool_calls (001)
        ├─ type===user_message → user_messages (006)  ← 本版
        └─ (agents upsert 005)

timeline.refetch(canonical)
        │
        └─ entries[] { item, timestamp, turnId, seqStart }
              └─ user_message → upsert（补 ts）

UI 查询
        └─ select user_messages + aggregate（禁止现场 refetch 全库 timeline）
```

## 2. 幂等键

优先顺序（第一个非空）：

1. `item.messageId`
2. `item.clientMessageId`
3. `item.id`（ProviderTimelineIdentity）
4. 无标识时仅在 canonical 路径使用 `hash(agentId + "|" + turnId + "|" + seqStart)`；live 无标识条目暂不入库，等待重扫历史。快照下标与 canonical seq 并非同一标识，不能各自生成主键导致重复。

表主键：`(agent_id, message_id)`。

Live `turn_ended` 全量快照：与 tool_calls 相同——**不要**把当前 `event.turnId` 误盖到历史消息上；仅对已知单条或 refetch 条目写 `turn_id` / `ts`。

## 3. 采集

### 3.1 Live

在现有 `ingestTimeline` 旁增加 `ingestUserMessages(timeline, agent, opts) → UserMessageRow[]`，于 `index.server.ts` 的 `turn_ended` 中与 tool ingest 一并 `upsertUserMessages`。

Live 无可靠 item 时间戳时：`ts = null`，`ingested_at = now`（与 tool_calls NG5 一致）；有效展示时间 `COALESCE(ts, ingested_at)`。

### 3.2 回填

`resyncAgents` / canonical 分页循环中，对 `entry.item.type === "user_message"` 写入，`ts = entry.timestamp`，`turn_id = entry.turnId`，`seq = entry.seqStart`。

打开全局 activity / by-provider 时：可复用现有 sync 节奏；**不必**为 messages 单独全量扫 timeline（依赖 resync + 后续 turn_ended 懒回填）。若首次升级后 messages 为空，文档提示用户跑一次「重扫历史」。

## 4. 数据模型

```sql
CREATE TABLE IF NOT EXISTS user_messages (
  agent_id       TEXT NOT NULL,
  message_id     TEXT NOT NULL,
  workspace_id   TEXT,
  provider       TEXT NOT NULL,
  turn_id        TEXT,
  seq            INTEGER,
  ts             TEXT,
  ingested_at    TEXT NOT NULL,
  PRIMARY KEY (agent_id, message_id)
);
CREATE INDEX IF NOT EXISTS idx_user_messages_ts ON user_messages(ts, ingested_at);
CREATE INDEX IF NOT EXISTS idx_user_messages_agent ON user_messages(agent_id, workspace_id);
```

**不存 `text`。**

jsonl：`user_messages.jsonl` 旁路（与 `agents.jsonl` 同模式）。

## 5. 聚合与 RPC

### 5.1 ActivityDay

```ts
ActivityDay {
  date, skills, mcp, agents, messages, total // total 仍 = skills+mcp
}
```

`aggregateActivityByDay` 增加对 `user_messages` 行按 local day 计数（provider 过滤与 tool 相同）。

### 5.2 KPI / by-provider

- 全局 KPI `Messages`：窗内 `selectUserMessages(filter).length`
- `ProviderUsageItem` 增加 `messageCount`（该 provider 窗内创建消息数）；无消息的 provider 若仅有 agents/tools 仍按现逻辑出现

### 5.3 UI（global-surface）

- `UsageStats` 增加 Messages
- 热力图 tooltip：`N skills, M mcp, A agents, U messages …`
- insights：增加 `Total messages`
- Provider 筛选项：全库有 agents / tools / messages 的 provider（与时间窗解耦）；message-only / agent-only provider 均出现
- 静默回填见 008；不再提供手动 Rescan 入口

不改 pill。

## 6. 与 005 的边界

| | 005 Agents | 006 Messages |
|---|---|---|
| 事件 | created / archived / list | user_message |
| 热力字段 | `agents` = 当日创建数 | `messages` = 当日发送数 |
| 无活动 | 创建即有 | 未发送则为 0 |

## 7. 迁移

- `SCHEMA_SQL` `CREATE TABLE IF NOT EXISTS`；已有 usage.db 打开即建表
- 升级后旧库 messages 为空直至 resync 或新 turn

## 8. 测试计划

- `ingestUserMessages`：只映射 user_message；幂等主键；忽略 assistant
- `aggregateActivityByDay`：messages 独立于 skills；仅创建日 agents 不影响 messages
- store upsert / jsonl 旁路
- 类型：ActivityDaySchema 含 messages
