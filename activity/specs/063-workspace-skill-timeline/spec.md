# 063 — Workspace Skills / MCP 时间线视图

- 状态：已实现，页面验收待完成
- 日期：2026-09-22
- 依赖：001（skill 调用采集）、024（Explorer Workspace Activity）

## 1. 背景

Explorer → Activity 的 Skills / MCP 区块原本只按实体聚合并按调用次数排序，无法直接看出最近调用了什么、由哪个 agent 调用。

## 2. 目标

| ID | 目标 |
|---|---|
| G1 | 保留现有按调用次数排序的 Skills 视图 |
| G2 | 新增按调用时间倒序的 Skills 时间线视图，每一行代表一次 skill 调用 |
| G3 | 时间线行标题显示 skill 名，副标题显示调用该 skill 的 agent 标题 |
| G4 | Skills 标题右侧在 Skills / MCP 切换按钮后增加视图切换按钮 |
| G5 | 时间线只读本地库，并按当前 workspace 过滤 |
| G6 | 排行 / 时间线视图选择使用 host-scoped plugin settings 持久化，与 Agents 筛选偏好一致 |
| G7 | MCP 使用相同的排行 / 时间线视图；Skills 与 MCP 共用一个持久化选择 |
| G8 | 时间线节点反映对应 agent 的归档状态：激活为 accent，归档为灰色 |
| G9 | 激活 agent 的时间线行可点击并打开对应会话；归档行不可点击 |

## 3. 行为与口径

- 默认为时间线视图；切换写入 `explorer-agent-display` 的共用 `rankView`，跨 Skills / MCP、workspace、插件 reload 与 daemon 重启保持。已保存的排行选择不覆盖。
- 时间线按 `ts ?? ingestedAt` 倒序，最多展示 8 条。
- 每次 exact / inferred skill 调用各占一行；`low` 与聚合 `total` 口径一致，不作为真实调用展示。
- 每次 MCP 调用各占一行，标题显示 `server.tool`。
- agent 标题取本地 `agents.title`；缺失时回退 `agentId`。
- agent 归档状态复用 Workspace Agents 经宿主目录实时校正后的 `archivedAt`；节点颜色激活用 `theme.colors.accent`，归档用 `theme.colors.foregroundMuted`。
- 激活 agent 的时间线整行复用 workspace panel 的 `navigation.openAgent({ agentId })`；归档行不提供跳转。
- 时间线行右侧显示调用时间；排行行继续显示调用次数。

## 4. 验收

- [x] Skills 标题右侧同时显示 MCP 切换和 Skills 视图切换按钮（typecheck）
- [x] 时间线从上到下按最近调用排序，重复 skill 调用不合并（handler test）
- [x] 每行副标题显示 agent 标题，缺失标题时显示 agent ID（handler test + client fallback）
- [x] workspace 隔离、`low` 排除及 8 条上限有测试覆盖
- [x] Skills 视图选择持久化，无记录与 v1 默认时间线；显式 `ranked` 保留（settings migration tests）
- [x] MCP 时间线按最新调用排序并显示 agent 标题（handler test）
- [x] Skills / MCP 共用持久化视图，v2 `skillView` 自动迁移并保留选择（settings migration test）
- [x] Skills / MCP 时间线节点按对应 agent 激活 / 归档状态着色（复用 host archive reconciliation；typecheck）
- [x] Skills / MCP 时间线中的激活 agent 行点击后打开对应会话，归档行不可点击（typecheck / reload）
- [x] `npm test`、`npm run typecheck`、`paseo plugin reload activity-dev`（217 tests；dev 实例 running）
