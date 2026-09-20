# 041 — plan

## 方案

展示 + 注册表字段透出；子数量以本地 `usage.agents` 为准（host 目录的 `parentAgentId` 常为 null，真实关系在 label / 本地库）。

- `shared/usage.ts`：`AgentUsageItem.parentAgentId`；`aggregateAgents` 从 registry 合并
- `constants.ts`：`countSubAgentsByParent(items)`；保留 host 侧 `countDirectSubAgents`
- `list-host-agents.ts`：`resolveParentAgentId`（一等字段优先，否则 `paseo.parent-agent-id` label）；推送缺省时保留 previous
- `agents-section.tsx`：用全量 `agentItems` + `statusFilters` 预聚合 parent → count，传入 `AgentRow.subAgentCount`
- `agent-row.tsx`：角标位优先 `running` → 否则数字
- `panel.tsx`：样式 + 传入 `agentItems`

## 文件

| 文件 | 改动 |
|---|---|
| `shared/usage.ts` | `parentAgentId` 进 AgentUsageItem |
| `client/workspace/list-host-agents.ts` | label 回退解析 |
| `client/workspace/constants.ts` | `countSubAgentsByParent` |
| `client/workspace/agents-section.tsx` | 按 registry 计数 |
| `client/workspace/agent-row.tsx` | 角标优先级 |
| `client/workspace/panel.tsx` | 样式 / 传 agentItems |
| 单测 / `specs/README.md` / `CHANGELOG.md` | 登记 |

## 依赖边界

- 不新增 RPC；`usage.agents` 已含 registry
- 只计直接子节点；归档口径跟随 Status 筛选项（Active / Archived / 两者）
