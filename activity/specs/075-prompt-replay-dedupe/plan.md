# 方案

- 纯函数 `replayDuplicateMessageIds(rows)`（`server/prompt-dedupe.ts`）：输入单个 agent 的 user message 行，返回应删除的 `messageId` 集合，实现 spec 规则 A / B。
- `UsageStore.pruneReplayDuplicateMessages(agentId?)`：按 agent 分组调用纯函数并删除；不传 agentId 时处理全库。
  - SQLite：一个事务内按主键删除。
  - JSONL：内存删除并追加 `__delete_messages` 墓碑行，加载时回放墓碑。
- 调用点：
  - 存储打开时（启动修复存量，SQLite 在 074 的时间修复之后）
  - `resyncAgents` 每个 agent 扫描完成后
  - `agent.turn_ended` 写入 user messages 后
- 回放副本每次扫描都会被重新 upsert 再删除，结果不变；只在签名变化的扫描上发生，成本为单 agent 数百行级。
