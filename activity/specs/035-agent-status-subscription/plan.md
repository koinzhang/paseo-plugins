# 035 — plan

## 方案

`WorkspaceActivityPanel` 内新增一个 `useEffect`：

- `paseo.agents.subscribe(handler)` 返回 unsubscribe；handler 按 workspace 过滤后 300ms 防抖 invalidate 状态查询
- 依赖 `[paseo, queryClient, workspaceId]`；cleanup 取消订阅 + 清 timer
- 不改数据流：仍由 `loadWorkspaceAgentStatuses` 通过 `agents.list` 拉取

## 文件

| 文件 | 改动 |
|---|---|
| `client/workspace/panel.tsx` | 订阅 effect + `useEffect` import |
| `specs/README.md` / `CHANGELOG.md` | 登记 |

## 依赖边界

- 只用 host SDK 已有订阅；无新 RPC / 依赖
- 轮询与订阅并存，订阅失效时行为退化为现状

## 2026-09-19 审查修正（038，优先于上述原设计）

0.8.0 agents.subscribe 只挂本地监听，现有推送依赖宿主 observation；不调用 list({ subscribe: {} }) 抢占宿主单 slot。轮询承担完整性保证。035 改为增量缓存更新；037 单 agent 改真实 timeline turn 事件，workspace 仅为启发式刷新提示，不保证回合结束语义。详见 ../038-sdk-api-remediation/。
