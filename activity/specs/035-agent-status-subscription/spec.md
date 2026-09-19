# 035 — Agent 状态订阅刷新

- 状态：已实现
- 日期：2026-09-19
- 依赖：033 / 034（attention 状态展示）

## 1. 背景

Explorer 面板的 agent 状态（permission / attention / lifecycle）走 `["activity","workspace-agent-status",workspaceId]` 查询，15s 轮询一次，徽标与图标颜色最多延迟 15s。host SDK 提供 `paseo.agents.subscribe`（`agent_update` 推送，pill 已在用），可把状态刷新做到近实时。

## 2. 目标

| ID | 目标 |
|---|---|
| G1 | 订阅 `paseo.agents.subscribe`；`agent_update` 命中当前 workspace 时 invalidate 状态查询 |
| G2 | 300ms 防抖，合并突发 upsert，避免连续重查（`agents.list` 分页） |
| G3 | 保留 15s 轮询作为兜底（订阅断线 / 事件丢失） |
| G4 | workspace 切换或组件卸载时取消订阅并清掉 pending timer |

## 3. 非目标

| ID | 非目标 |
|---|---|
| NG1 | 改为全局 store 或把 snapshot 直接写入 query cache |
| NG2 | 其它查询（summary / skills / mcp / terminals / 本地 agents）保持现有轮询 |

## 4. 口径

- `update.kind === "upsert"` 且 `agent.workspaceId` 存在且不等于当前 workspace → 忽略
- `kind === "remove"` 或 workspaceId 缺失 → 视为可能影响当前 workspace，刷新
- 刷新方式：`queryClient.invalidateQueries({ queryKey: ["activity","workspace-agent-status", workspaceId] })`
- 防抖 300ms；cleanup 执行 unsubscribe + clearTimeout

## 5. 验收

- [ ] pending permission / finished / error 出现与清除在 1s 内反映到列表（待真机目视确认）
- [ ] 切换 workspace 不再收到旧 workspace 的刷新（待真机目视确认）
- [x] `npm run typecheck` / `paseo plugin reload activity` → running
