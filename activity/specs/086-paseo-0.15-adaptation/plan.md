# 086 — plan

## 依赖

| 插件 | `@getpaseo/plugin` | `@getpaseo/client` | `requirements.paseo` |
|---|---|---|---|
| activity | 0.9.0-beta.2 → 0.15.1 | — | >=0.9.0 → >=0.15.0 |
| commands | 0.9.2 → 0.15.1 | 0.9.2 → 0.15.1 | 同上 |
| customize | 0.9.1 → 0.15.1 | — | 同上 |
| mono | 0.9.1 → 0.15.1 | — | 同上 |
| inbox | 0.9.2 → 0.15.1 | 0.9.2 → 0.15.1 | 同上 |

`commands` / `inbox` 继续自行安装 `@getpaseo/client`：server 端需要内部 `DaemonClient`（公开 SDK 无 unarchive / 设置写操作），该包由插件 bundle 打进 daemon 包，不走宿主实例。

## 代码映射

| 旧 API | 新 API | 位置 |
|---|---|---|
| `client.addSurface(id, Component)` | `client.addScreen({ id, title, Component })` | activity / customize / inbox `index.client.tsx` |
| `client.addSidebarItem({ id, title, icon, surface })` | `client.addSidebarHeaderItem({ id, title, Component })` + `SidebarRow` | 同上，新增 `client/sidebar-item.tsx` |
| `openSurface(id)`（Command Center / slash command） | `openScreen({ screenId })` | activity / customize / inbox；customize `slash-command.ts` 与单测 |
| `addWorkspacePanel({ context: "agent" })` | `client.addAgentPanel({ ... })` | activity `index.client.tsx` |
| `addWorkspacePanel({ context: "workspace" })` | 省略 `context` | activity `index.client.tsx` |
| 面板 props `agentId` | `params.agentId` | activity `client/panel.tsx` |
| `@getpaseo/plugin/client/react-native` | `@getpaseo/plugin/client/ui` | 五个插件共 26 个文件 |
| `server.on("agent.created" \| "agent.archived" \| "agent.turn_ended")` | `server.addHook("agent.create.after" \| "agent.archive.after" \| "agent.turn.after")` | activity `index.server.ts` |
| `event.timeline`（0.13 起恒为空） | `paseo.agents.ref(id).timeline.refetch({ projection: "canonical", direction: "tail", limit: 500 })` | activity `index.server.ts` |

## 面板 props 兼容

`PluginAgentPanelProps` 仍带 deprecated 的 `context` / `agentId` 字段（0.12 别名，2027 年才移除）。activity 面板改为从 `params.agentId` 读取；注册改为 `addAgentPanel`，不再传 `context`。

## 钩子行为

`agent.turn.after` 的 `waits: false`，回调本身立即返回，实际采集在内部 async IIFE 中完成。`timeline` 为空后：

1. `upsertAgents` 仍按钩子快照更新 agent 元数据
2. `timeline.refetch` 取尾部 500 条 canonical 条目
3. `ingestUserMessages` + `ingestTimeline` 入库（终态 call 过滤保留）
4. `background.request` 继续触发全量/增量巡检，负责完整历史与 canonical 归因

## 验证

- `npm run typecheck` / `npm test`（五个插件）
- `paseo plugin reload` + `paseo plugin ls`（activity / commands / customize / inbox）
- mono 用 `paseo plugin install "$PWD" --id mono-verify` 验证构建与加载，随后 `paseo plugin remove mono-verify`
- activity 日志检查 `turn.after` 行
