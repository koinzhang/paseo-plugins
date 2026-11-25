# 017 Research

## 已核对锚点

- 日期：2026-11-25。
- paseo-plugins 基线：`5326249867269f7cda3a70315d584a3da886a218`。
- 只读上游：`../paseo`，HEAD `1ff119dc2a42825e7fdc46c504b6ccee52a4f8be`；`packages/plugin/package.json` 为 `0.17.4`。
- `paseo --version` 输出 `0.17.4`，退出码 0；另有 Electron codesign `task_name_for_pid` stderr 警告，未阻止版本读取。
- Inbox 实际安装：`node_modules/@getpaseo/plugin/package.json` 与 `node_modules/@getpaseo/client/package.json` 均为 `0.15.1`；client 自带 protocol `0.15.1`。Inbox manifest 要求 `>=0.15.0`。
- 开始时 inbox 范围干净；commands 已有其他 agent 的未提交修改，本任务不触碰。

下面上游路径均相对 `../paseo`，当前实现路径相对 `inbox/`。

## 可复用 SDK 改进与未采纳原因

| 候选 | 已验证上游依据 | 当前实现与决定 |
|---|---|---|
| `defineSubscription`、`useSubscription`、`client.subscribe` | `packages/plugin/src/rpc.ts` 定义契约；`packages/plugin/src/index.ts` 导出；`packages/plugin/src/server/contracts.ts` 提供 handler 的 `push` / `signal`；`packages/plugin/src/client/rpc-context.tsx` 负责挂载、输入变化与清理；`public-docs/plugins/reference.md` 的 Subscription RPCs 描述重连和生命周期 | `client/selection.ts` 用安装内通知刷新，`client/inbox-surface.tsx` 用 React Query 与 10s 状态轮询。这组新 API 可支持服务端写入后的跨客户端刷新，真实收益存在，但需要新订阅契约与依赖安装。现有 0.15.1 `dist/rpc.d.ts` 与 server contracts 没有该接口，本轮按授权边界不采用，不伪造兼容 shim。 |
| `useAgents`、`useWorkspaces`、`useProjects` 和 `AgentRef` / `WorkspaceRef` / `ProjectRef` | `packages/plugin/src/client/index.ts` 导出；`packages/plugin/src/client/client-state.tsx` 与 `packages/plugin/src/client/query.ts` 实现集合查询；`packages/plugin/src/client/reference-api.ts` 用 ref.hostId 路由 host；`packages/app/src/plugins/installation-provider.tsx` 在安装级提供 state | 新 hooks 不再局限 workspace panel。旧 SDK `dist/client/client-state.js` 的错误文案仍为 `inside a workspace panel`，不能按旧研究断言新宿主也如此。但 `packages/app/src/plugins/client-state/source.ts` 的 `projectHost()` 明确跳过无 workspace 或 archived agent；缓存缺失不能解释为 missing。保留 `server/agents.ts` 的逐 id `refresh()` 查询与 SQLite 标题同步，不把 archived 误判为 deleted。 |
| 公开 agent / workspace / project 查询与过滤 | `packages/client/src/index.ts` 的 PaseoApi / handle 类型与 `listAgents` / `listWorkspaces`；`packages/protocol/src/messages.ts` 的 `AgentDirectoryFilterSchema`；`packages/server/src/server/session.ts` 的分页路径 | 当前 `server/agents.ts`、`server/directory.ts` 已用公开 SDK 分页。agent filter 没有 workspaceId 字段，workspace handle 的 agents 只有 create，没有 list；不能臆造 workspace-scoped list。project key 仍需 `server/project-key.ts` 解析 git remote，替换成 Paseo projectId 会破坏旧数据匹配。 |
| 公开 `agent.reload()` 代替反归档的内部 `refreshAgent()` | `packages/client/src/index.ts` 的 `createAgentHandleFactory`：`refresh` 调用 `fetchAgent`，`reload` 调用 `refreshAgent`；`packages/server/src/server/session.ts` 的 `handleRefreshAgentRequest` 先 unarchive，且会 interrupt / reload 已运行 session | 公开 agent handle 没有 unarchive，workspace handle 也没有 inspect / restore recovery。只替换最后一次调用不能消除内部连接，反而增加重复 snapshot 读取；保留 `server/agents.ts` 中 inspect → restore workspace → refreshAgent 的现有序列。 |
| workspace recovery client 变化 | `packages/client/src/daemon-client.ts` 的 `restoreWorkspace()` 设置 `timeout: 0`，等待终态或断连；现有 0.15.1 `dist/daemon-client.js` 同方法为 `timeout: 150000` | 这是实际内部 client 差异：旧 client 可能在较长恢复流程未结束时超时。不能仅依据源码声称当前必然出错。本轮不升级依赖、不调用真实恢复、不新增超时重试；是否与 SDK 一起对齐 client 交主 agent 决定。 |
| `wholeTurns: true` 历史读取 | `packages/client/src/index.ts` 的 `PaseoAgentTimelineRefetchOptions`；`packages/server/src/server/agent/timeline-projection.ts` 扩展页边界到整轮；`public-docs/plugins/migration.md` 的 Turn history；本地 0.15.1 public timeline options 未声明 wholeTurns，虽低层实现已做 capability gating | `client/last-exchange.ts` / `shared/last-exchange.ts` 按 007 最多 5 × 80 行、分别找最新 prompt 与最新回复。只读最新一轮会丢失新 prompt 尚未回复时的上一条回复；扩展整轮又取消行数预算。本轮不为了新接口改变历史语义或无界传输。 |
| `PluginFile` / metadata / hook 存储 | `packages/plugin/src/client/file.ts` 是文件面板的读写 / watch 接口；`packages/plugin/src/server/contracts.ts` 没有 SQLite 或 server dataDir API；`packages/plugin/src/server/lifecycle.ts` 和 `public-docs/plugins/hooks.md` 定义实体 metadata 与生命周期 | 不是全局关系数据的替代。保留 `server/store.ts` 的 SQLite schema、迁移、唯一索引和 `~/.paseo/plugin-data/inbox/inbox.db`；不把笔记迁入实体 metadata，也不新增生命周期 hook 代替状态查询。 |
| 新注册形式 / slash command | `public-docs/plugins/migration.md`；`packages/plugin/src/client/contracts.ts` 的 `PluginClientSlashCommandContribution` / `PluginWorkspacePanelContribution`；`public-docs/plugins/hooks.md` 的 Renamed hooks | Inbox 已用 addScreen、addSidebarHeaderItem、addSlashCommand、/client/ui；未注册旧 server.on / server.before。workspace panel 的 context 仍为 deprecated alias，但没有实际行为收益，不把删一个字段当作本轮升级。保留 `/inbox` 的收藏 / scratch 路径。 |

## 版本决策与证据边界

SDK 0.17.4 `package.json` 的 peerDependencies 要求 `@getpaseo/client` 与 `@getpaseo/protocol` 同为 `0.17.4`。若采用新导出，需同步处理开发依赖、内部 client、lockfile 与 host 最低版本，不能只 bump SDK。当前没有采用新接口，因此不改依赖或 `requirements.paseo`。

本次完成源码审查和现有依赖下的静态 / 单测验证；没有安装 0.17.4 npm 依赖、没有 reload，也没有执行真实收藏、跨客户端写入、归档 / 恢复或 GUI 操作。不能据此宣称运行时验收完成。
