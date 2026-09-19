# 024 — Explorer workspace Activity 面板

- 状态：已实现
- 日期：2026-09-19
- 依赖：001（RPC / UI 基座）、014（KPI 口径）、019（coding 判定）、023（命名）

## 1. 背景

Explorer 是 workspace 级容器（agents / terminals / files / diffs）。此前 Activity 只有两种视角：全局 surface（跨 workspace、按 provider）与 agent workspace panel（单 agent）。缺少「当前 workspace 内各 agent 干了多少活」的视图。

## 2. 目标

| ID | 目标 |
|---|---|
| G1 | 新 RPC `usage.agents`：按 `workspaceId`（+ 时间窗）聚合 per-agent 活动 |
| G2 | 新 workspace-context panel（id `workspace-activity`，`locations: ["explorer"]`，标题 Activity） |
| G3 | 面板：时间范围 chips（All time / Today / 7 days / 30 days）+ KPI + Agents 排行（点击打开会话）+ Top skills / Top MCP（≤8） |
| G4 | 查询只读本地库；`workspaceId` 过滤贯穿全部 RPC |
| G5 | 单测覆盖 `aggregateAgents` 与 handler |

## 3. 非目标

| ID | 非目标 | 说明 |
|---|---|---|
| NG1 | 不改全局 surface / agent panel / pill / Command Center（仍 2 项） | — |
| NG2 | Explorer 不加热力图 | 52 周网格在窄侧栏不可读；全局 surface 已有 |
| NG3 | 不做 provider / model 拆分 | 全局已有；workspace 视图聚焦 agent |
| NG4 | 不做跨 workspace 对比 | 全局 KPI 已有 Workspaces |
| NG5 | agent panel 不迁入 Explorer | 保持 workspace tab；命名见 023 |

## 4. 口径

| 项 | 规则 |
|---|---|
| per-agent 行 | 以本地库 `tool_calls` / `user_messages` 的 agentId 为准；registry（`agents`）补 title / provider / createdAt |
| skillCalls | exact + inferred（low 不计，同 001 / 面板 total） |
| shell / file reads / writes | 014 互斥口径（`isShellCall` / `isFileRead` / `isFileWrite`） |
| coding | 019 `isCodingOp`：窗口内 ≥1 次写文件或写盘 shell |
| 排序 | `callCount + messageCount` 降序 → lastActivityAt 降序 → title / agentId 字典序 |
| 空 agent | registry 中无活动的 agent 也列出（全 0），便于发现闲置 |
| 时间窗 | from/to 过滤 tool_calls / user_messages；registry 不按窗口裁剪（title 需完整） |

## 5. 验收

- [x] `usage.agents` 返回排序后的 per-agent 行；low 不计 skillCalls；无活动 agent 全 0
- [ ] Explorer 出现 Activity 面板；范围切换 / KPI / 排行正常；点击 agent 打开会话（待真机验收）
- [x] 空数据有空态；15s 轮询
- [x] `npm test`、`npm run typecheck`、`paseo plugin reload activity`
