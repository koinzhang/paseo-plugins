# 005 — Plan（HOW）摘要

> 已实现；细节以代码与 `spec.md` 为准。此处保留与 006 的边界说明。

## 采集

- Live：`agent.created` / `agent.archived`；`turn_ended` 补注册（保留更早 `created_at`）
- 回填：`paseo.agents.list()` + 仅有 `tool_calls` 的 agent 用最早调用时间近似创建

## 查询

- `selectAgents({ from, to, provider, workspaceId })` 按 **created_at** 过滤
- 热力图 `agents`、by-provider `agentCount` 只读注册表，不读 tool_calls distinct

## 与 006 边界

- 005 **不**统计 user_message / turn
- 对话发送次数见 [006-user-messages](../006-user-messages/)
