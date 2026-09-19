# 004 — 热力图展示 agent 活动

- 状态：已实现（agents 语义见 005）
- 日期：2026-09-19
- 依赖：002；**agents 计数定义由 005 覆盖**

## 1. 目标

在全局 **Activity** 页的 Tool activity 热力图中，除 skill / MCP 外，按天展示 **agent 数**。

## 2. 非目标

- 不改格子着色公式（仍用 `skills + mcp`）→ **已改**：着色 `total = skills+mcp+agents+messages`（见实现）
- 不做「仅按 agent 着色」的独立热力模式
- 不保证 weekly / cumulative 下的 agent 为去重全集（见行为）

## 3. 行为

- Daily：`agents` = **当日创建的 agent 数**（`created_at` 本地日；见 005；不再要求当日有 skill/MCP）
- Weekly / Cumulative：对每日 `agents` **求和**
- Tooltip / a11y：展示 skills、mcp、agents、messages
- 着色强度：`total = skills + mcp + agents + messages`
- Provider / 时间过滤：与 002 相同
- Streak：与 Active days 一致（任一维度 > 0；见 010）

## 4. 契约

`ActivityDay.agents`；`usage.activity-by-day` — zod 为真相源。
