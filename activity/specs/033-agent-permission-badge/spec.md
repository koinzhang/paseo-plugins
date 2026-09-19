# 033 — Agents 行 pending permission 徽标

- 状态：已实现
- 日期：2026-09-19
- 依赖：024 / 031（Workspace panel）

## 1. 背景

Explorer 的 Agents 列表目前只展示用量元信息，不显示 agent 的待处理权限请求。host `agents.list` 返回的 `AgentSnapshotPayload` 含 `pendingPermissions`（agent-monitor 插件即以此判断 `permission` 状态），数据源现成。

## 2. 目标

| ID | 目标 |
|---|---|
| G1 | `pendingPermissions.length > 0` 的 agent 行显示 warning 色徽标（`ShieldAlert` 图标；数量 > 1 时附计数） |
| G2 | 该类 agent 排序归入 attention 档（`attentionRank` rank 0），与 running/attention 一样靠前 |
| G3 | 无 pending permission 时不渲染徽标，行外观不变 |

## 3. 非目标

| ID | 非目标 |
|---|---|
| NG1 | 在插件内批准 / 拒绝权限（仍在 agent 会话内操作） |
| NG2 | 为 finished / error 等其他 attention 原因新增徽标（排序已由 rank 处理） |
| NG3 | 修改 host 数据或新增 RPC / SQLite 字段（只读 `agents.list`） |

## 4. 口径

- 数据：`loadWorkspaceAgentStatuses`（`paseo.agents.list`，已有查询）把 `pendingPermissions.length` 存入 `AgentStatusInfo.permissionCount`
- 展示：`AgentRow` 在归档按钮前渲染 pill（`statusWarning` 图标/文字，`surface1` 底 + `border` 描边）；count === 1 只显示图标，> 1 显示数字
- 排序：`attentionRank` 在现有 attention 条件外增加 `pendingPermissions.length > 0`
- 可访问性：行 `accessibilityLabel` 追加 pending permission 描述

## 5. 验收

- [ ] 有 pending permission 的 agent 行出现 warning 徽标，无的不出现（待真机目视确认）
- [ ] 多权限时徽标显示数量；该类 agent 排在列表前部（待真机目视确认）
- [x] `npm run typecheck` / `paseo plugin reload activity` → running
