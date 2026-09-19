# 017 — Insights 恢复 Top provider 并重排

- 状态：已实现
- 日期：2026-09-19
- 依赖：010（insights 框架）、015（Top model）

## 1. 背景

015 用 Top model 替换了 Top provider；provider 与 model 是不同粒度，Insights 应同时保留。  
Tools per message 与 KPI（Skill/MCP calls）及 Coding vs chat 信息重叠，价值低。

## 2. 目标

| ID | 目标 |
|---|---|
| G1 | 恢复 **Top provider**（口径同 010：仅 All；筛选中或无数据 → `—`） |
| G2 | 删除 **Tools per message** |
| G3 | 仍固定 **8 行**；顺序按习惯 → 偏好 → 结构重排 |
| G4 | 保留 **Top model**（口径不变，015） |

## 3. 非目标

- 不改 KPI、热力图、Most used
- 不改 Top provider / Top model 的计量口径（messages 加权）
- 不新增 RPC

## 4. 固定 8 行（新顺序）

| # | Label | 值 | 口径 |
|---|---|---|---|
| 1 | Active days | 整数 | 同 010 |
| 2 | Longest streak | `N days` | 同 010 |
| 3 | Busiest day | `MMM d · …` | 同 010 |
| 4 | Peak weekday | 短星期名 | 同 010（从末位移至日历组） |
| 5 | Top provider | `Label · N%` | All：messages 占比最高的 provider；筛选中或无数据 → `—` |
| 6 | Top model | `Name · N%` | 同 015 |
| 7 | Messages per agent | 比率 | 同 010 |
| 8 | Coding vs chat | `N% coding` | 同 010/014 |

分组意图：日历习惯（1–4）→ 偏好（5–6）→ 会话结构（7–8）。

## 5. 验收

- [x] Insights 含 Top provider + Top model，无 Tools per message
- [x] 顺序与上表一致
- [x] provider 筛选中 Top provider 为 `—`；Top model 仍按该块计算
- [x] `npm run typecheck`、`npm test` 通过
