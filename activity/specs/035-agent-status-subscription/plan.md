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
