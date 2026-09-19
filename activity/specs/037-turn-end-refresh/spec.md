# 037 — 本地用量查询随回合结束刷新

- 状态：已实现
- 日期：2026-09-19
- 依赖：035（agents.subscribe 模式）

## 1. 背景

本地 SQLite 用量查询全部走 15s 轮询（Workspace 面板 summary / agents / skills / mcp，Agent 面板 skills / mcp / summary，pill 空态 1.5s）。server 在 `agent.turn_ended` 时 ingest，宿主会推送 `agent_update`；可据此在回合结束后立即刷新，轮询只作兜底。

## 2. 目标

| ID | 目标 |
|---|---|
| G1 | 新增共享 hook：订阅 `agent_update`，匹配 scope（workspace / agent / 全局）且状态离开 running/initializing 时触发回调；300ms 防抖 + 2s 后补一次（覆盖 server ingest 异步落库的 race） |
| G2 | Workspace 面板：回合结束 invalidate workspace-summary / workspace-agents / workspace-skills / workspace-mcp |
| G3 | Agent 面板：回合结束 invalidate 该 agent 的 skills-by-name / mcp-by-tool / summary |
| G4 | Composer pill：回合结束 invalidate pill 查询；空态兜底轮询 1.5s → 5s，非空 15s 不变 |
| G5 | 15s 轮询全部保留作兜底 |

## 3. 非目标

| ID | 非目标 |
|---|---|
| NG1 | Global surface 的聚合查询（by-provider / activity-by-day）保持 15s |
| NG2 | Terminals（host SDK 无订阅 API）保持 5s |
| NG3 | 不做 running 期间的中途刷新（回合中数据未 ingest） |

## 4. 口径

- 事件判定：`kind === "upsert"`，scope 匹配（`agentId` / `workspaceId` 可选），且 `status !== "running" && status !== "initializing"`
- workspace 过滤与 035 一致：仅当 `agent.workspaceId` **存在且不等于**当前 workspace 时忽略；`workspaceId` 缺失则仍刷新（可能影响当前仓）
- 防抖 300ms 首次刷新；2s 后补一次 settle 刷新，覆盖 `agent.turn_ended` → SQLite 写入的延迟
- hook cleanup：unsubscribe + 清两个 timer
- pill 空态轮询 `EMPTY_REFETCH_MS = 5s`（原 1.5s），事件到达即 invalidate

## 5. 验收

- [ ] Workspace / Agent 面板在回合结束后 1-3s 内更新计数与列表（待真机目视确认）
- [ ] pill 在回合结束后 1-3s 内出现/更新徽标，空闲时不再 1.5s 高频轮询（待真机目视确认）
- [x] `npm run typecheck` / `paseo plugin reload activity` → running
