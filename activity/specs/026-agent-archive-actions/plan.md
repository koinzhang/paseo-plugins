# 026 — plan

## UI

`WorkspaceActivityPanel` 每行 Agents 末尾加图标按钮：

- `archivedAt == null` → Archive，`paseo.agents.ref(id).archive()`
- `archivedAt != null` → ArchiveRestore，`useRpc(usageAgentUnarchiveRpc)`
- `useToast().error` 报告失败；`queryClient.setQueryData` 乐观改 `archivedAt`，再 `invalidateQueries`

## Server

- 新 RPC `usage.agent.unarchive`：`execFile("paseo", ["agent", "reload", agentId])`，然后 `upsertAgents` 清 `archivedAt`
- `mergeAgentRow` / SQL：`archived_at = excluded.archived_at`（可 null）
- `agentRowFromSnapshot`：写入 `agent.archivedAt ?? null`

## 验证

`npm test`、`npm run typecheck`、`paseo plugin reload activity`
