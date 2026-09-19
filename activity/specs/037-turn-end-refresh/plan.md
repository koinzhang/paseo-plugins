# 037 — plan

## 方案

- 新增 `client/use-agent-turn-end.ts`：共享订阅 hook（scope 过滤 + 防抖 + settle + cleanup），回调存 ref 避免重复订阅；workspace 过滤与 035 同口径（仅明确异仓才忽略）
- `client/workspace/panel.tsx`：调用 hook invalidate 4 个 workspace 查询
- `client/panel.tsx`：调用 hook invalidate 3 个 agent 查询
- `client/usage-query.tsx`：`useUsagePillData` 内调用 hook invalidate pill 查询；`EMPTY_REFETCH_MS` 降频到 5s

## 文件

| 文件 | 改动 |
|---|---|
| `client/use-agent-turn-end.ts` | 新增共享 hook |
| `client/workspace/panel.tsx` | workspace 查询失效 |
| `client/panel.tsx` | agent 查询失效 |
| `client/usage-query.tsx` | pill 查询失效 + 空态降频 |
| `specs/README.md` / `CHANGELOG.md` | 登记 |

## 依赖边界

- 只用 host `agents.subscribe`；无新 RPC / 依赖
- 每个面板一个订阅 + pill 每挂载图标一个订阅，事件回调只做定时器操作
