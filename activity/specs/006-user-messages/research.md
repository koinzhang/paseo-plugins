# 006 — Research

## 1. 结论摘要

| 问题 | 结论 |
|---|---|
| 用户发送在 timeline 的形态 | `type: "user_message"`，字段含 `text`, 可选 `messageId` / `clientMessageId`，及 identity `id` |
| 是否与 agent 创建同一维度 | 否；正交（005 vs 006） |
| 是否用 turn 数代替 | 不优先；turn 有取消/失败/无 user item 偏差 |
| 存储 | **SQLite 事件表**；timeline 仅采集/回填 |
| 正文 | 不入库 |
| Token | 本版不做（`ProviderUsage.session.usage` 对普通插件不稳定） |

## 2. 源码依据（Paseo 0.8 / @getpaseo/plugin）

- `provider.d.ts` — `ProviderTimelineItem` 含：
  - `{ type: "user_message"; text; messageId?; clientMessageId? } & ProviderTimelineIdentity`
  - `{ type: "assistant_message"; ... }`
- `lifecycle.d.ts` — `agent.turn_ended`：`timeline: readonly AgentTimelineItem[]`（全量快照）
- `agent.turn_started` / `turn_ended` + `outcome`：可用于后续 turn 维度，**非本版主键**
- 001 research：live 快照无统一时间戳；canonical refetch `entries[]` 有 `timestamp / turnId / seqStart`

## 3. 与现有实现的对齐点

| 模式 | 复用 |
|---|---|
| turn_ended 全量快照勿误盖 turnId | `server/ingest.ts` 注释与 tool_calls 相同约束 |
| COALESCE(ts, ingested_at) | activity / tool 已采用 |
| resync 全量 upsert 纠偏 | `resyncAgents` |
| jsonl 旁路文件 | `agents.jsonl` 同级 |

## 4. 开放问题（实现时关闭）

- [ ] 各 provider 的 `user_message` 是否稳定带 `messageId` / `clientMessageId` / `id`
- [ ] 同一逻辑发送是否会出现重复 item（乐观 UI + 确认）——主键策略是否够去重
- [ ] 无 user_message、仅有 turn 的 provider 是否存在；若有，是否在 insights 注明 Messages 可能低估
- [ ] 长会话 refetch 分页是否漏消息（与 001 开放的 limit 问题相同）
- [ ] composer 附件-only 发送是否生成 `user_message`

## 5. 明确不采用的方案

**查询时对所有 agent `timeline.refetch` 计数**：全局页不可接受的延迟与负载；且与 001/005「本地库为查询面」不一致。

## 6. 本次实现核对（2026-09-19）

- 安装的 `@getpaseo/protocol/dist/agent-types.d.ts` 中，AgentTimelineItem 的 user_message 只声明 messageId/clientMessageId，未声明 id；实现对运行时 id 做字符串检查，不能假设每个 provider 都有 ID。
- 无 ID 的 live 条目暂不落库；canonical 使用 agent/turn/seq 哈希。不同 provider 实际身份稳定性与乐观项合并仍需真机验证。
- canonical 沿现有 tail/before 分页读取；新增两页重复重扫测试，确认无 ID 历史与有 ID 消息幂等。
- 空文本 user_message 测试计入；真实附件-only 发送的 provider 行为尚未验收。
- SQLite 和 JSONL 均通过回填精确时间后重放 live 不降级、重开后持久化、正文未写入测试。
