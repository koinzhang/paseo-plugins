# 041 — Agents 行子 agent 数量角标

- 状态：已实现（待真机）
- 日期：2026-09-20
- 依赖：024 / 031（Workspace panel）、035 / 036（状态缓存 + running 角标）

## 1. 背景

host `agents.list` 的 agent 快照含 `parentAgentId`。父会话已 spawn 子 agent 时，Explorer Agents 行没有数量提示；用户无法一眼看出哪些会话带有子 agent。036 已在图标右下角放 running loading；同一位置可复用，但 loading 必须优先。

## 2. 目标

| ID | 目标 |
|---|---|
| G1 | 有直接子 agent（`parentAgentId === 本行 agentId`）时，机器人图标右下角显示子 agent 数量 |
| G2 | 同一角标位：`running` loading **优先于** 子 agent 数量；running 时不叠数字 |
| G3 | 数量来自本地 `usage.agents` 注册表（`parentAgentId`）；不新增 RPC |
| G4 | 行 a11y label 在有子 agent 时追加数量描述 |

## 3. 非目标

| ID | 非目标 |
|---|---|
| NG1 | 从列表隐藏子 agent 行 / 折叠树形展示 |
| NG2 | 嵌套孙代递归计数（只计直接子节点） |
| NG3 | 点击角标展开子 agent 列表 |
| NG4 | 改 attention popover 行的角标语义（可传 0 / 省略） |

## 4. 口径

- 数据：**优先**本地 `usage.agents` 注册表的 `parentAgentId`（与查询面一致）；host 状态图另存 `parentAgentId`，解析时一等字段为空则回退 label `paseo.parent-agent-id`（与 agent-crew 一致）
- 判定：`subAgentCount > 0` 且当前未显示 running 角标（`!(running && !archived)`）时显示数字
- 视觉：与 036 同位置（图标右下角、surface0 底）；数字 `tabular-nums`，数量 ≥ 100 显示 `99+`
- 子数量与 Agents **Status** 筛选项对齐：
  - 仅 Active → 只计未归档子 agent
  - 仅 Archived → 只计已归档子 agent
  - Active + Archived 都开 → 全部直接子 agent（不区分归档）
  - 都未选 → 角标为 0
- 归档父行：仍可按上述口径显示数量（与 running 不同；running 在归档行不出现）

## 5. 验收

- [ ] Status=Active：仅未归档子计入；Status=Archived：仅归档子计入；两者都开：全部计入；父行 running 时只显示 loading（待真机目视）
- [x] `npm run typecheck` / `npm test` / `paseo plugin reload activity` → running
