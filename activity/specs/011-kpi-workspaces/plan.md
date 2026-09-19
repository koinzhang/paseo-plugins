# 011 — Plan

## 数据

`aggregateByProvider` 的 agents 入参扩展为带 `workspaceId`：

- 每 provider：`Set<workspaceId>` → `workspaceCount`
- `totals.workspaceCount`：全量 agents 全局去重（供 All 筛选）

`selectAgents` 已返回 `workspaceId`；handler 无需改查询，只改聚合与 schema。

## UI

`client/global-surface.tsx` KPI：

- 去掉 `summary.total`（skills+mcp）
- All → `byProvider.totals.workspaceCount`；单 provider → 该行 `workspaceCount`
- label：`Workspaces`

## 契约

`ProviderUsageItem.workspaceCount`；`usage.by-provider` totals 增加 `workspaceCount`。
