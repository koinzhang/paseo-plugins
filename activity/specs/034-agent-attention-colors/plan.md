# 034 — plan

## 方案

纯展示改动，数据沿用 033 的 `agents.list` 状态查询。

- `client/workspace/constants.ts`：`AgentStatusInfo` 增加 `requiresAttention` / `attentionReason`；新增 `AgentAttentionKind` 与 `attentionKind(info)` 判定函数
- `client/workspace/list-host-agents.ts`：映射 `requiresAttention` / `attentionReason`
- `client/workspace/agents-section.tsx`：`renderAgentRow` 计算 `attentionKind` 并传入
- `client/workspace/agent-row.tsx`：新增 `attentionKind` prop；机器人图标按 kind 取 `accent` / `statusDanger` / `foregroundMuted`；行 label 追加状态描述

## 文件

| 文件 | 改动 |
|---|---|
| `client/workspace/constants.ts` | 状态字段 + `attentionKind` 判定 |
| `client/workspace/list-host-agents.ts` | 提取 attention 字段 |
| `client/workspace/agents-section.tsx` | 传入 attentionKind |
| `client/workspace/agent-row.tsx` | 图标配色 + a11y |
| `specs/README.md` / `CHANGELOG.md` | 登记 |

## 依赖边界

- 不新增查询 / RPC；复用 `["activity","workspace-agent-status",workspaceId]` 15s 轮询
- 无新样式对象（颜色内联），跨平台无特殊处理
