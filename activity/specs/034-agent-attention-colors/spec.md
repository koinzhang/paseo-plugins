# 034 — Agents 行 attention 状态配色

- 状态：已实现
- 日期：2026-09-19
- 依赖：024 / 031（Workspace panel）、033（permission 徽标）

## 1. 背景

host `agents.list` 的 `requiresAttention` / `attentionReason` 有 `finished` / `error` / `permission` 三种。033 已用 warning 徽标表示 permission；`finished`（回合结束未查看）与 `error`（失败）目前在列表里没有任何视觉区分，只参与排序。

## 2. 目标

| ID | 目标 |
|---|---|
| G1 | `attentionReason = "finished"`（或 `requiresAttention` 且回合完成）：行首机器人图标用 `accent` 色 |
| G2 | `attentionReason = "error"` 或 `status = "error"`：机器人图标用 `statusDanger` 色 |
| G3 | `permission`：图标同样用 `accent` 色，并保留 033 的 warning 徽标 |
| G4 | 用户查看后 host 清除 attention（`requiresAttention=false`），图标自动恢复 `foregroundMuted`（15s 轮询内） |
| G5 | 归档行（`archivedAt != null`）不染色，保持 `BotOff` + muted |

## 3. 非目标

| ID | 非目标 |
|---|---|
| NG1 | 插件主动清除 attention（由 host 在查看时处理） |
| NG2 | 为 `initializing` / `providerUnavailable` / `lastError` 等其它状态增加视觉 |
| NG3 | 新增筛选维度（Attention 筛选另案，见 033 讨论） |

## 4. 口径

- 数据：`AgentStatusInfo` 增加 `requiresAttention` / `attentionReason`，由 `paseo.agents.list` 提取
- 判定：`status === "error"` → error；`permissionCount > 0` → permission；否则 `requiresAttention && attentionReason === "error" | "finished"` 对应染色，其余 null
- 颜色：finished / permission → `theme.colors.accent`；error → `theme.colors.statusDanger`；无 attention → `foregroundMuted`
- 可访问性：行 label 追加 `failed` / `turn finished, unread`（permission 由 033 的计数描述覆盖）

## 5. 验收

- [ ] finished 的 agent 图标为 accent 色，打开会话后 15s 内恢复 muted（待真机目视确认）
- [ ] error 的 agent 图标为红色；archived 行不染色（待真机目视确认）
- [ ] permission 行图标为 accent 色并显示 warning 徽标（待真机目视确认）
- [x] `npm run typecheck` / `paseo plugin reload activity` → running
