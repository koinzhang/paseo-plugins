# 040 — Composer attention pill（同 workspace）

- 状态：已实现（待真机验收）
- 日期：2026-09-20
- 依赖：033 / 034 / 035 / 038（Workspace agents attention 状态）

## 1. 背景

Workspace Activity（Explorer）已展示同仓 agents 的 live attention（finished / permission / error），但用户深陷某个 agent 的 Composer 时往往看不见其它会话在等自己。需要在 Composer track 提供「非当前、可行动」的 interrupt 捷径。

## 2. 目标

| ID | 目标 |
|---|---|
| G1 | 每个 agent 的 Composer 上注册独立 attention pill（与现有 Activity 用量 pill 并存）；**仅当**本 workspace 存在 ≥1 个需注意且非当前会话的 agent 时 `visible: true` |
| G2 | 纳入集合：同 `workspaceId`、非当前 `agentId`、`attentionKind` ∈ `{ finished, permission, error }` |
| G3 | **排除**：当前会话；其它 workspace；无 attention 的 idle/running/closed；archived（无 host 活跃状态或不在状态 map） |
| G4 | **≥1** 个：点击 pill 一律展开 **同一** popover 列表（finished / permission / error 共用入口与行样式）；点行 `openAgent` + `close()`。不再因数量=1 直跳 |
| G5 | 列表样式对齐 Explorer Agents 行（Bot 图标 + attention 配色 + permission 徽标）；三种 kind 行结构一致（标题 + 最新用户消息预览；error 无特殊文案） |
| G6 | Pill 图标与色（聚合 tint）：permission → `Bell` + warning；error → `CircleAlert` + danger；finished → `CircleCheck` + success；混合优先级 permission > error > finished；label 为数量字符串 |
| G7 | Popover 行副标题为该 agent **最新一条用户消息**预览（host timeline `tail`，不落库；无消息则不显示副标题）；不显示 finished / needs attention 文案 |
| G8 | 数据复用 Workspace 状态查询（`loadWorkspaceAgentStatuses` + 同 query key + `agents.subscribe` 增量）；可见性由 contribute 层 sync；15s 轮询保证完整；不抢 `list({ subscribe })` observation slot |

## 3. 非目标

| ID | 非目标 |
|---|---|
| NG1 | 跨 workspace / 全 host attention（另开产品面） |
| NG2 | 展示 running-only / 无 attention 的 agent |
| NG3 | 在 pill 内批准权限、归档、搜索、筛选 |
| NG4 | 与 Activity 用量 pill 合并为一个入口 |
| NG5 | 绕行 013 宿主 popover 幽灵层（仍用宿主 popover；真机记录） |

## 4. 口径

### 4.1 集合过滤

对 `Record<agentId, AgentStatusInfo>`（当前 workspace）：

1. 去掉 `agentId ===` 当前 Composer 的 agent
2. 保留 `attentionKind(info) ∈ { finished, permission, error }`
3. 排序：permission → error → finished；同档按 `updatedAt` 降序（缺省靠后）

### 4.2 交互

| 数量 | Pill | 点击 |
|---|---|---|
| 0 | `visible: false` | — |
| ≥1 | visible；label = count；图标色按 G6 | **同一** popover 列表（含 finished / permission / error）；点行 `openAgent` + `close()` |

### 4.3 打开会话

优先 `navigation.openAgent({ agentId })`（面板 / Global 注册的 bridge）。不可用时**不回退** `openPanel`（避免误开 Agent Activity）；点击无响应。状态 sync 进行中 pill `disabled: true`。

### 4.4 列表 UI

复用 / 精简 Explorer `AgentRow` 视觉：Bot 图标 attention 配色、permission `ShieldAlert` 徽标；**无**归档按钮、无 running spinner 要求（本集合不含纯 running）。标题来自 `useAgent` / host snapshot `title`，缺省回退 agentId 短展示。

## 5. 验收

- [ ] 同 workspace 另有 finished / permission / error（非当前）→ **同一** pill 计数包含全部 kind；点击一律 popover；行样式一致（Bot 配色区分 kind）
- [ ] 仅 1 个需注意会话（含仅 error）→ 仍开 popover，不直跳
- [ ] 仅当前会话 attention、或其它 workspace → 本 Composer pill 不出现
- [ ] 与 Activity 用量 pill 同时可存在；attention 为 0 时不占位
- [x] `npm run typecheck`；单测覆盖过滤/排序；`paseo plugin reload activity` → running
- [ ] 真机：streaming 时 popover（013 风险）；openAgent bridge
- [ ] 真机：error 行 Bot 为 danger 色；聚合 tint 为 error 时 pill 为 CircleAlert
