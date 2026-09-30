# 016 收藏 agent 跟随改名

## 问题

收藏 agent 时把标题写进 `agent_snapshot`（及 `title` 列），之后 agent 在 Paseo 里改名，Inbox 仍显示收藏时的旧名，搜索和按名称排序也按旧名。

## 已定决策

1. `agents.states`（客户端每 10 秒轮询、列表加载后立即请求一次）已逐个读取 host 上的 agent；顺带把最新非空标题写回存储：`agent_snapshot.title` 与 `title` 列同时更新，不改 `updated_at`（改名不算 Inbox 条目修改，不影响「修改时间」排序）。
2. 有标题变化时响应带 `titlesChanged: true`，客户端据此刷新列表，因此标题在打开页面后即时、之后最多 10 秒内更新。
3. host 已不认识的 agent（missing）或标题为空时保留最后已知标题。

## 验收

- [ ] 收藏的 agent 改名后，全局页面与 Workspace Inbox 列表 / 详情显示新名称。
- [ ] 按新名称可以搜到，按名称排序使用新名称。
- [ ] 归档后的 agent 仍保留改名后的标题；删除的 agent 保留最后已知标题。
