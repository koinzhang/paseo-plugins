# 010 — Activity insights 解读型指标

- 状态：已实现（习惯优先 8 行）
- 日期：2026-09-19
- 依赖：002/005/006；Shell/File 口径见 [014](../014-shell-file-ops/)

## 1. 目标

Insights 回答「我怎么在用」，不与 KPI 总量、Most used 实体抢戏。

| 层 | 职责 |
|---|---|
| KPI | 规模与当前连续 |
| Insights | 习惯、结构、强度解读 |
| Most used | 默认 skills；标题旁图标切换 MCP |

## 2. 非目标

- 不展示 Skills explored / MCP servers used / Shell&file 绝对值
- 不改热力图着色 → **已改**：含 agents + messages（与 skills/mcp 合计）
- 不新增 RPC

## 3. 固定 8 行（习惯优先）

| # | Label | 值 | 口径 |
|---|---|---|---|
| 1 | Active days | 整数 | 窗内有 messages/agents/skills/mcp 的天数 |
| 2 | Longest streak | `N days` | 同活跃定义；缺省 `—` |
| 3 | Busiest day | `MMM d · …` | 先 messages 峰值；否则 skills+mcp+agents |
| 4 | Top provider | `Label · N%` | All：messages 占比优先；筛选中或无数据 → `—` |
| 5 | Messages per agent | 比率 | 会话平均深度；agents=0 → `—` |
| 6 | Tools per message | 比率 | `(skills+mcp)/messages`；messages=0 → `—` |
| 7 | Coding vs chat | `N% coding` | `(shell+fileOps)/(shell+fileOps+messages)`；皆 0 → `—` |
| 8 | Peak weekday | 短星期名 | 活跃日按本地 weekday 累加 volume，取最大 |

**两列**（insights + Most used）共用 **`ACTIVITY_LIST_LIMIT = 8`**。Most used 默认 skills，标题右侧图标切换 MCP。

## 4. Streak

Current streak → KPI；Longest streak → insights。

## 5. 验收

- [x] 上述 8 行顺序与口径
- [x] 无 Avg messages / day、Shell & file ops 绝对值
- [x] Most used 默认 skills，图标切换 MCP；与 insights 上限同 8
- [x] `npm run typecheck`、`npm test` 通过
