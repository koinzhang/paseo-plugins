# 011 — Research

- 本地 Paseo 源码 `packages/plugin/src/client/contracts.ts`：`addSlashCommand` 支持 `agent` 上下文；回调带 `agent`、`workspace`、`rpc`、`openSurface`。
- `packages/plugin/src/contracts.ts`：agent snapshot 的 `provider` 为字符串；workspace snapshot 的 `projectRootPath` 为字符串。
- `packages/plugin/src/settings.ts`：`settingsRpc(id)` 提供带 revision 的 read / write；conflict 写入不会覆盖更新数据。
- `packages/app/src/plugins/settings/use-settings.ts`：Customize surface 的 `useSettings` 读相同 RPC 并响应 `plugin_settings_changed`。
- 上游本地源码锚点：`49f9cec6be01ef7e7604dadf127425eac6493820`，本机 CLI `paseo --version` 为 `0.9.1`，daemon status 报告 `0.9.2`。公开文档在线地址因当前环境 DNS 不可用，已对照本地 `public-docs/plugins/reference.md`。
