# Research

锚点：Paseo `30178c4f5`（2026-09-27），`paseo --version` 0.10.2。

- 公开 SDK 只有 agent `archive()`（`public-docs/sdk/reference.md`），没有 unarchive。
- app 的「Unarchive」按钮（`packages/app/src/components/archived-agent-callout.tsx`）调用 `client.refreshAgent(agentId)`；daemon 的 `handleRefreshAgentRequest`（`packages/server/src/server/session.ts`）先执行 `unarchiveAgentState` 再重载 session。因此插件在 server 端用内部 `DaemonClient.refreshAgent` 实现反归档，做法同 `commands/server/daemon.ts`。
  - 风险：`@getpaseo/client/internal/*` 属于内部 API，升级时需要复查。
- 多 host：`public-docs/plugins/reference.md` 写明「same contribution on several connected hosts → one sidebar item + host picker; selected host supplies bundle, Paseo API, RPC transport, query cache」，所以按 host 切换数据不需要插件自己实现。
- `agent.archived` 生命周期事件存在，但不需要订阅它：状态以实时查询为准，收藏条目不受影响。
- workspace handle 暴露 `projectId` 和 `directory`；Paseo 的 `projectId` 与 remote 没有对应关系，所以 project key 由插件自己根据 git 计算。

## 开放问题

- 存储：已定 SQLite。`node:sqlite` 通过 `process.getBuiltinModule` 加载（同 `activity/server/store.ts`）；不可用时直接报错，不回退。
- workspace 恢复：`refreshAgent` 里的 `restoreOwningWorkspaceForLegacyAgentRefresh` 只对 v0.1.105 之前的旧 client 生效（COMPAT，计划 2027-01-11 删除），所以不能指望它顺带恢复 workspace。app 的恢复入口（`packages/app/src/workspace-recovery/use-workspace-recovery.ts`）在 `server_info.features.workspaceRecovery` 为 true 时调用 `DaemonClient.inspectWorkspaceRecovery` / `restoreWorkspace`（`workspace.recovery.*` 协议，restore 超时 150s）。插件照这个做法，先恢复 workspace，再 `refreshAgent`。
  - inspect 结果（`packages/server/src/server/session/workspace-recovery/workspace-recovery-service.ts`）：活动 workspace 返回 `unavailable` + `workspace_not_archived`，插件把它当作「无需恢复」；其余 `unavailable` 原因（`workspace_not_found`、`project_not_found`、`workspace_directory_missing`、`worktree_branch_missing`、`project_directory_missing`）直接报错，不反归档 agent。`recoverable.action` 为 `unarchive`（目录仍在）或 `restore`（按分支重建 worktree）。
  - 已实测（2026-09-30，本机 daemon 0.10.2）：`features.workspaceRecovery` 为 true；活动 workspace inspect 返回 `{ kind: "unavailable", reason: "workspace_not_archived" }`。已归档 workspace 和 worktree 已删除的情况仍待实测。
- `useAgent` / `useWorkspace` 依赖 workspace panel 提供的 state source，在 sidebar surface 中调用会抛错（iOS 实测报错，源码见 `packages/plugin/src/client/client-state.tsx:24`）。surface 里 agent 状态只走 RPC。
