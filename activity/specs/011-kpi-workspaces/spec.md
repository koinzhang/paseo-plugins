# 011 — KPI Total calls → Workspaces

- 状态：已实现
- 日期：2026-09-19
- 依赖：005（agents 注册表）、001（by-provider）

## 1. 目标

全局 Activity 页 KPI 横条将 **Total calls**（skill+MCP 合计）改为 **Workspaces**（去重 workspace 数）。Skill calls / MCP calls 仍保留，Total calls 与二者重复。

## 2. 非目标

- 不改热力图、streak、insights、Most used 排行
- 不新增独立 RPC；扩展现有 `usage.by-provider`
- 不统计已归档但未在窗内创建的历史 workspace（除非同窗有 agent 创建记录）

## 3. 口径

| 项 | 规则 |
|---|---|
| 来源 | `agents` 表，与 Agents KPI 同筛选（`created_at` ∈ 时间窗，可选 provider / workspaceId） |
| 计数 | 非空 `workspace_id` 去重个数；`null` 不计 |
| Provider = All | 跨 provider **全局去重**（不可对各 provider 的 `workspaceCount` 求和） |
| Provider = 单家 | 该 provider 下 agent 的去重 `workspace_id` |
| 标签 | `Workspaces`（与 Messages / Agents 复数风格一致） |

## 4. 验收

- [x] KPI 横条出现 Workspaces，不再出现 Total calls
- [x] 同一 workspace 下多 provider / 多 agent 时 All 视图只计 1
- [x] 时间窗 / provider 筛选与 Agents 联动
- [x] `npm run typecheck`、`npm test` 通过
