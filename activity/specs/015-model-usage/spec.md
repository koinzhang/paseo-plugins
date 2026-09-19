# 015 — 用户消息加权的 Model 使用

- 状态：已实现
- 日期：2026-09-19
- 依赖：006（user_messages）、001（by-provider / 全局 UI）

## 1. 背景

内置 provider 与 ACP 均在 agent 快照上暴露 `model`（及可选 thinking）。Activity 此前只记消息次数，无法回答「实际对话最常用哪个 model」。

口径选定：**按 user_message 条数加权**（发送当时的 model），而非按 agent 创建时的 model。

## 2. 目标

| ID | 目标 |
|---|---|
| G1 | 每条 `user_messages` 行可存可空 `model`（发送时快照） |
| G2 | Live `turn_ended` 与 canonical resync 尽量写入 model |
| G3 | `usage.by-provider` 每 provider（及客户端 All 合并）暴露 model 排行 |
| G4 | 全局 Activity：**Most used models**（与 skills / MCP 同列切换） |
| G5 | Insights：**Top model**（messages 加权；无数据时 `—`） |

## 3. 非目标

| ID | 非目标 | 说明 |
|---|---|---|
| NG1 | Thinking / effort 统计 | 另案；本版只 model |
| NG2 | Token / cost | 同 006 |
| NG3 | 精确还原历史换模前的 model | resync 只能用扫描时快照；旧行可空 |
| NG4 | 按 agent 创建 model 计数 | 不采用 |
| NG5 | 改 pill / agent panel 主语义 | 仅全局 surface |
| NG6 | 新独立 RPC | 扩展 `usage.by-provider` + messages 行 |

## 4. 口径

| 项 | 规则 |
|---|---|
| 计量单位 | 一条带非空 `model` 的 `user_message` = 1 |
| Model id | agent 快照 `model` 字符串 trim；空 / 仅空白 → 存 `null`，不计入排行 |
| Live | `turn_ended` 时 `paseo.agents.ref(id)` 读当前 model 后写入本批消息 |
| Resync | 用 list/snapshot 上的当前 model 写入；`COALESCE` 填充空位，不覆盖已有非空 model |
| 筛选 | 同 Messages：时间窗 + provider 芯片 |
| Top model（insights） | All：全窗 messages 最多的 model；单 provider：该块内；并列按 id 字典序 |

## 5. 验收

- [x] 新发送的 user_message 入库带 model（单测 + live resolve）
- [x] Most used 可切换到 Models，按 messages 降序
- [x] Insights 出现 Top model
- [x] 无 model 的历史消息不扭曲排行（不计入）
- [x] `npm run typecheck`、`npm test` 通过
