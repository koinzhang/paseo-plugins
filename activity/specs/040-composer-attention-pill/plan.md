# 040 — plan

## 方案

纯客户端；无新 RPC / SQLite。复用 033–038 的 host 状态管道，在 Composer 增加第二条 pill。

```text
agents.list (projectKeys + workspaceId) ──15s──┐
agents.subscribe (增量) ──────────────────────┼─→ query ["activity","workspace-agent-status",workspaceId,projectId]
                                               └─→ filterAttentionAgents(statuses, currentAgentId)
                                                    ├─ count 0 → pill.visible=false
                                                    ├─ count 1 → behavior.action → openAgent
                                                    └─ count ≥2 → behavior.popover → AttentionPopover 列表
```

## 模块

| 文件 | 职责 |
|---|---|
| `client/attention-agents.ts` | 纯函数：过滤 finished/permission/error、排序、汇总 pill tint / icon |
| `client/attention-agents.test.ts` | 过滤 / 排序 / tint |
| `client/use-workspace-agent-statuses.ts` | 共享 query + subscribe（供 Workspace panel 与 attention pill） |
| `client/open-agent.ts` | `setOpenAgent` / `tryOpenAgent` bridge；面板挂载时注册 |
| `client/attention-pill.tsx` | `contributeAttentionPills`：目录监听注册 pill；icon 驱动 visible/label/behavior/色 |
| `client/attention-popover.tsx` | ≥2 列表；行点击 open + close |
| `client/workspace/agent-row.tsx` | 可选隐藏归档（popover 复用） |
| `client/workspace/panel.tsx` / `client/panel.tsx` | 改用共享 hook；注册 openAgent bridge |
| `index.client.tsx` | `contributePills` 后串联 `contributeAttentionPills` |

## Pill 行为切换

One shared pill for finished / permission / error; **always** popover when count ≥ 1 (no single-item jump). Live path: `agents.subscribe` → `publishAttentionStatuses` → pill visibility + icon/popover via `useAttentionStatuses`. 15s poll is completeness only (does not disable pill after first load).

## 打开会话

```ts
tryOpenAgent(agentId) // no openPanel fallback
```

sync 期间对该 workspace 的 pills `disabled: true`，结束后清掉。
Agent / Workspace / Global 面板 mount 时 `setOpenAgent(navigation?.openAgent ?? null)`，unmount 时若仍是同一引用则清空。

## 依赖边界

- 不调用 `agents.list({ subscribe })`（038）
- 不跨 workspace
- popover 已知 013 风险，不额外绕行
