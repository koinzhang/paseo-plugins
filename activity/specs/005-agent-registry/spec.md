# 005 — Agent 注册表（凡创建即计入）

- 状态：已实现
- 日期：2026-09-19
- 依赖：001 / 004；扩展插件数据面（不仅 tool_calls）

## 1. 背景

004 热力图的 `agents` 来自当日有 skill/MCP 的 distinct `agent_id`，未创建过工具的 agent 不出现。产品要扩展为：**agent 一经创建即进入统计**，与是否调用 skill/MCP 无关。

## 2. 目标

| ID | 目标 |
|---|---|
| G1 | 持久化 agent 注册表（创建 / 归档元数据） |
| G2 | live：`agent.created` / `agent.archived` 写入 |
| G3 | 回填：`agents.list()`；并对仅有 tool_calls、无注册记录的 agent 用最早调用时间近似 `created_at` |
| G4 | 热力图 `agents` = **当日创建数**（local day of `created_at`） |
| G5 | 全局 / by-provider 的 `agentCount` = 时间窗内 **创建** 的 agent 数（含 0 调用） |

## 3. 非目标

- 不做 turns / **用户消息计数**（→ [006-user-messages](../006-user-messages/)）
- 不做 token
- 不改 pill / agent panel 的 skill·MCP 语义
- 不保证插件启用前已 archive、且从未进 `agents.list`、也无 tool_calls 的 agent（无法观测）
- weekly/cumulative 下 agents 仍为每日创建数求和（agent-creation-days）

## 4. 数据模型

`agents` 表（sqlite）/ `agents.jsonl`（jsonl 旁路）：

| 列 | 说明 |
|---|---|
| agent_id | PK |
| workspace_id | nullable |
| parent_agent_id | nullable |
| provider | raw provider id |
| title | nullable |
| created_at | ISO；upsert 时保留更早值 |
| archived_at | nullable |
| updated_at | ISO |

## 5. 验收

- 新建 agent 且未调 skill/MCP → 热力图创建日 `agents ≥ 1`；KPI Agents 计入
- 仅有 skill/MCP 的历史 agent → 回填后仍有注册行
- `npm test` / `typecheck`；reload running
