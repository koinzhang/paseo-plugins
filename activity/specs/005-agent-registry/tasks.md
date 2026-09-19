# 005 tasks

- [x] T1 store：`AgentRow` + sqlite/jsonl upsert/select；schema 更新
  - 验证：store.test upsertAgents；SCHEMA_SQL / contracts/schema.sql
- [x] T2 `syncAgents`：list 回填 + tool_calls 近似创建；resync / activity / by-provider 调用
  - 验证：`syncAgentsFromPaseo` in handlers
- [x] T3 lifecycle：`agent.created` / `agent.archived`；turn_ended 补注册
  - 验证：index.server.ts hooks
- [x] T4 `aggregateActivityByDay` / `aggregateByProvider` 改用创建 agents
  - 验证：usage.test 创建独立计数；无调用 agent 计入 agentCount
- [x] T5 单测 + typecheck + reload；更新 004 spec 注明 agents 语义变更
  - 验证：npm test 71/71；typecheck；paseo plugin reload → running
