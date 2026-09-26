# Research

版本锚点沿用 001：Paseo `49f9cec6b`，`paseo --version` 0.9.2，`@getpaseo/plugin` / `@getpaseo/client` 0.9.2。

## 已验证契约

- Tab 即当前 agent 标题。001 已用 `DaemonClient.updateAgent(agentId, { name })`。插件 SDK 的 `PaseoAgentHandle` 仍无改名接口。
- Workspace 标题：`PaseoWorkspaceHandle.setTitle(title)`（`packages/client/src/index.ts`）转发 `workspace.title.set.request`。Daemon 会 trim，空字符串存成 `null` 并回退派生名称（`packages/server/src/server/session.ts` `handleWorkspaceTitleSetRequest`）。本命令仍要求非空标题，避免误清除。
- Slash callback 带 `workspace: PluginWorkspaceSnapshot`（`id`）和 `paseo: PaseoApi`。`@getpaseo/client` 0.9.2 的类型已包含 `setTitle`。
