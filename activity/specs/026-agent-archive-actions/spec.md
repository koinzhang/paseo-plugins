# 026 — Explorer Agents 行归档 / 反归档

- 状态：已实现
- 日期：2026-09-19
- 依赖：025（Explorer Status / Archived 筛选）

## 1. 目标

| ID | 目标 |
|---|---|
| G1 | 未归档 agent 行提供 **归档** 按钮；点击后调用宿主 `agents.ref(id).archive()`，将该 agent 软删除（归档） |
| G2 | 已归档 agent 行提供 **反归档** 按钮；点击后将该 agent 恢复为 Active（与宿主 Unarchive 同口径：`refresh_agent` / `paseo agent reload`） |
| G3 | 操作成功后 Agents 列表立即反映新状态（乐观更新 + invalidate）；失败时 toast 错误 |
| G4 | 本地 registry `agents.archived_at` 在反归档后可被清为 null（修复原先 COALESCE 只写不擦的问题） |

## 2. 非目标

- 不改 Status / Lifecycle 筛选默认值与交互
- 不提供 hard-delete
- 不在 Skills / MCP 排行行加按钮

## 3. 口径

- **归档**：SDK `paseo.agents.ref(agentId).archive()`；live `agent.archived` hook 仍写入 `archived_at`
- **反归档**：插件 RPC `usage.agent.unarchive` → 子进程 `paseo agent reload <id>`（宿主 Unarchive 同为 `refreshAgent`）；RPC 内将 registry `archived_at` 置 null
- `upsertAgents` / `mergeAgentRow`：`archived_at` 以本次写入为准（允许 null 清除）；`agentRowFromSnapshot` 透传 `agent.archivedAt`
- 行尾图标：Active → `Archive`；Archived → `ArchiveRestore`；**仅行悬停（或 busy）时显示**；busy 时禁用
- Agents 行垂直间距更紧（`paddingVertical: 6`，独立于 Skills/MCP 排行行）
- Active 行**整行**可点开会话（归档按钮为嵌套 Pressable，不触发跳转）；归档行仍不可点开

## 4. 验收

- [ ] Active 行点归档后，该 agent 在仅 Active 筛选下消失；打开 Archived 可见（实现完成，待真机验收）
- [ ] Archived 行点反归档后变为 Active，可再次打开会话链接（实现完成，待真机验收）
- [x] 失败时出现错误 toast；`npm test` / typecheck / reload
