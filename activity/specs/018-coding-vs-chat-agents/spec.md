# 018 — Coding vs chat 按 agent 会话二分

- 状态：已实现
- 日期：2026-09-19
- 依赖：005（agents）、006（messages）、014（shell/file 互斥口径）、017（insights 行序）

## 1. 背景

旧口径用 `(shell+fileOps)/(shell+fileOps+messages)`，单位混杂、读文件也抬高 coding，难理解。

用户期望：**有活动的 agent 会话**二分成 chat / coding，再算占比；**空会话（仅创建）不参与**。

## 2. 目标

| ID | 目标 |
|---|---|
| G1 | 窗内 agent：有 ≥1 次 shell 或 file R/W（014）→ **coding**；有活动但无上述 → **chat**；无 message 且无 tool_call → **空，排除** |
| G2 | Insights **Coding vs chat** = `round(coding / (coding+chat) * 100)% coding`；分母 0 → `—` |
| G3 | 与 provider 筛选一致 |
| G4 | `usage.by-provider` 暴露 `codingAgentCount`、`chatAgentCount` |

## 3. 非目标

- 不改 KPI Agents（空创建仍计入 KPI / 热力图）
- 不把 skill / MCP 算进 coding（仅 shell + file R/W）
- 分类只用当前查询窗内的 `tool_calls` / `user_messages`

## 4. 口径

> **Coding 判定已由 [019](../019-coding-mutating-ops/) 收紧**：仅 file write/edit/delete，或写盘 shell 启发式；纯 read / 只读 shell 不算 coding。

```text
isCodingOp = isFileWrite ∨ (isShellCall ∧ shellLooksMutating)   // 019

对窗内 agents 集合 A（与 agentCount 同源）：
  active(a)  = 窗内有 user_message ∨ 有任意 tool_call
  coding(a)  = 窗内有 isCodingOp
  chat(a)    = active(a) ∧ ¬coding(a)
  empty(a)   = ¬active(a)   // 不参与比率

Coding vs chat =
  coding+|chat| = 0  → "—"
  else → `${round(coding / (coding+chat) * 100)}% coding`
```

| 会话特征 | 分类 |
|---|---|
| 仅创建，无 message、无 tool_call | **排除** |
| 有 message / skill / MCP / 只读 shell / file read，无写盘 | chat |
| ≥1 次 file write/edit/delete，或写盘 shell | coding |

## 5. 验收

- [x] 空创建 agent 不进 coding、不进 chat
- [x] 仅 message → chat
- [x] 有 read/shell/write → coding
- [x] skill read / low-skill shell 不使会话变 coding（014）
- [x] 分母为 0 → `—`
- [x] `npm run typecheck`、`npm test` 通过
