# RPC

| name | input | output | 说明 |
|---|---|---|---|
| `items.list` | `{ kind?, projectKey?, query? }` | `{ items: Item[], projects: { key, label, count }[] }` | 置顶在前，按 `updated_at` 降序 |
| `items.save` | `{ id?, kind: 'note'\|'scratch', title?, body, cwd? }` | `{ item }` | 新建（按 `cwd` 解析 project）或更新 |
| `items.update` | `{ id, pinned?, kind?: 'note', title?, body? }` | `{ item }` | 置顶，scratch 转 note |
| `items.delete` | `{ id }` | `{}` | 同时用于取消收藏 |
| `agents.star` | `{ agentId }` | `{ item, created: boolean }` | server 端读取 agent 快照并计算 project；已收藏时返回已有条目 |
| `agents.states` | `{ agentIds: string[] }` | `{ states: Record<id, 'active'\|'archived'\|'missing'> }` | 批量；归档 / 不存在的判断以此为准 |
| `agents.unarchive` | `{ agentId }` | `{ restoredWorkspace: boolean }` | 必要时先 `restoreWorkspace`，再 `refreshAgent` |
