# 033 — plan

## 方案

复用现有 host 查询，纯展示改动，无新 RPC / 存储。

- `client/workspace/constants.ts`：`AgentStatusInfo` 增加 `permissionCount: number`；`attentionRank` 接受 `pendingPermissions` 并把非空计入 rank 0
- `client/workspace/list-host-agents.ts`：`HostAgentEntry.agent` 增加 `pendingPermissions?: ReadonlyArray<unknown>`；映射 `permissionCount: agent.pendingPermissions?.length ?? 0`
- `client/workspace/agent-row.tsx`：新增 `permissionCount` prop；> 0 时在归档按钮前渲染 `ShieldAlert` + 计数的 pill；行 `accessibilityLabel` 追加权限描述
- `client/workspace/agents-section.tsx`：`renderAgentRow` 从 `statuses[item.agentId]` 取 `permissionCount` 传入
- `client/workspace/panel.tsx`：新增 `permissionBadge` / `permissionBadgeText` 样式（`theme.colors.statusWarning`）

## 文件

| 文件 | 改动 |
|---|---|
| `client/workspace/constants.ts` | `AgentStatusInfo.permissionCount`；`attentionRank` 计入 pendingPermissions |
| `client/workspace/list-host-agents.ts` | 提取 `pendingPermissions.length` |
| `client/workspace/agent-row.tsx` | 徽标 UI + 可访问性标签 |
| `client/workspace/agents-section.tsx` | 传入 permissionCount |
| `client/workspace/panel.tsx` | 徽标样式 |
| `specs/README.md` / `CHANGELOG.md` | 登记 |

## 依赖边界

- 仅使用 `agents.list` 已返回字段，不引入新依赖
- 徽标为静态 View/Text/Icon，无交互，无跨平台特殊处理
