# 043 — Workspace Agents：Closed / 归档近实时（仅插件）

- 状态：已实现（待真机）
- 日期：2026-09-20
- 依赖：035 / 038（状态缓存）、025（Lifecycle Closed）

## 1. 背景

用户从宿主关闭 agent 后，Explorer Agents 行要等最多 ~15s 才进入 Lifecycle **Closed**（或 Active→Archived）。根因：插件不抢 `list({ subscribe })` slot，目录推送不可靠；`remove` 会从状态 map 删掉条目，Lifecycle 暂时变成 unknown。

## 2. 目标

| ID | 目标 |
|---|---|
| G1 | 对 `usage.agents` 已列出的 agent，用宿主 `useAgent` 快照的 `status` / attention 字段增量写入状态缓存（官方实时路径，**不**调用 `list({ subscribe })`） |
| G2 | 目录 `remove`：若 map 已有该 id，标为 `status: "closed"`，不删除条目（下一轮 list 轮询仍负责完整性） |
| G3 | 目录 upsert 缺 `workspaceId` 但 id 已在当前 workspace map 中：仍合并字段（避免误删导致 Closed 丢失） |
| G4 | 目录 `remove` 或 `status === "closed"` 时，启发式刷新 `usage.agents`（归档 `archived_at` 跟上） |
| G5 | 权限徽标仍靠 `agents.list` 轮询补齐（`PluginAgentSnapshot` 无 `pendingPermissions`） |

## 3. 非目标

| ID | 非目标 |
|---|---|
| NG1 | 插件自持 `agents.list({ subscribe: {} })`（0.8 单 slot 会顶掉宿主） |
| NG2 | 全局缩短所有 usage 查询的 15s 轮询 |
| NG3 | 改 pill / Global surface 刷新策略 |
| NG4 | 行上新增 “Closed” 文案（仍只靠 Lifecycle 过滤 / Sort=Status） |

## 4. 口径

- Live 源：`useAgent(id, selector)` → `status` / `updatedAt` / `requiresAttention` / `attentionReason` / `parentAgentId`
- `useAgent` 返回 `null`：按 `closed` 写入（会话已离开宿主活跃目录）
- 合并时省略 `pendingPermissions`，保留 map 中已有 `permissionCount`
- 仍保留 15s `loadWorkspaceAgentStatuses` 轮询作完整性兜底

## 5. 验收

- [ ] 宿主关闭 agent 后，Lifecycle=Closed（或仅选 Closed）在约 1s 内反映（待真机）
- [ ] 宿主归档后，Active 列表在推送或启发式刷新后尽快消失（≤ 现有 15s 兜底；有推送时近实时）（待真机）
- [ ] 不调用 `agents.list({ subscribe })`；permission 徽标不回退
- [ ] typecheck / 相关单测 / reload → running
