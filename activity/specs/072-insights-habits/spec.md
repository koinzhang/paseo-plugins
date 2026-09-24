# 072 — Activity insights 指标重排

## 目标

Global「Activity insights」固定 8 行，顺序：

| # | 指标 | 口径 |
|---|---|---|
| 1 | Active days | `isActiveDay` 的天数；KPI 不再显示（KPI 收为 4 格：Sessions / Prompts / Top provider / Top model） |
| 2 | Busiest day | 提示词最多的一天（无提示词退回总量），`Sep 19 · 484 prompts` |
| 3 | Workspaces | 会话覆盖的去重 workspace 数（011） |
| 4 | Coding vs chat | coding / (coding + chat) 会话占比（018 / 019） |
| 5 | Longest streak | `computeStreaks(days).longest`，`12 days` |
| 6 | Peak weekday | 活跃量最高的星期，完整名称（`Saturday`） |
| 7 | Multi-turn sessions | ≥2 条提示词的会话 ÷ ≥1 条提示词的会话（空会话不计），`64%` |
| 8 | Avg session duration | 每会话**投入时长**均值（见下），`formatDuration` |

移除：Skill calls、MCP calls（已有 Most used 列表与图表切换）、Prompts per session、Longest session。

### Avg session duration 口径

会话的创建时间、提示词、工具调用按时间排序，相邻间隔 ≤ 30 min（`SESSION_IDLE_GAP_MS`）才累加；无任何提示词 / 工具调用的会话不计入。避免「隔几天续聊」把会话算成数天：本机 created→last event 均值 221 min、created→archived 均值 696 min，投入时长均值 16.5 min。

由 `usage.agent-lifetime` 新增输出 `averageEngagedMs`（nullable）与 `promptedSessions` / `multiTurnSessions` 承载，受 provider 过滤；全时段。

## 验收

- 本机库：`32` · `Sep 19 · 484 prompts` · `106` · `82% coding` · `12 days` · `Saturday` · `64%` · `16 min`
