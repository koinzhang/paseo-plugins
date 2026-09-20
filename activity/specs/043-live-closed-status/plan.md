# 043 — plan

## 策略

只改 Activity 插件 client：用宿主已规范化的 `useAgent` 快照加速 lifecycle，修目录增量合并边界。不碰 daemon / 不抢 observation。

```text
useAgent(id) ──┐
agents.subscribe ──┼─→ updateWorkspaceStatusCache ─→ query workspace-agent-status
15s agents.list ───┘                                      │
                                                          ▼
                                              matchesAgentFilters / Sort=Status
remove | status=closed ──→ useWorkspaceActivityRefresh ──→ invalidate usage.agents
```

## 文件

| 路径 | 变更 |
|---|---|
| `client/workspace/list-host-agents.ts` | `remove`→closed；缺 workspaceId 但 id 已知则合并 |
| `client/workspace/agent-live-status-sync.tsx` | 每 agent 一子组件，`useAgent` → setQueryData |
| `client/use-workspace-agent-statuses.ts` / `panel.tsx` | 挂载 sync；agentIds 来自 `usage.agents` |
| `client/use-agent-turn-end.ts` | workspace 启发式：含 `remove` 与 `closed` |
| `client/workspace/list-host-agents.test.ts` 等 | 回归 |

## 风险

- 大量 agent 时每行一个 `useAgent`：仅 Explorer 已列出的 registry agents，可接受
- `useAgent` null 一律 closed：误伤极短窗口的加载空窗——仅当 map 已有该 id 或随后 list 纠正
