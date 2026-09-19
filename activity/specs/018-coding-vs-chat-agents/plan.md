# 018 — 实现方案

## 1. `aggregateByProvider`

- `codingAgentIds`：isCodingOp 的 agentId
- `activeAgentIds`：任意 tool_call 的 agentId ∪ message.agentId
- 每个 provider：
  - `codingAgentCount` = |agents ∩ coding|
  - `chatAgentCount` = |agents ∩ active − coding|
- messages 入参需带 `agentId`（`selectUserMessages` 已有）

## 2. Insights

`codingVsChatValue(coding, chat)`：分母 `coding+chat`；`global-surface` 累加两字段。

## 3. 测试

空创建 → coding=0 chat=0；仅 message → chat；coding ops → coding；014 互斥。
