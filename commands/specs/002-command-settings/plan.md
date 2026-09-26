# Plan

依据：Paseo 插件设置 API（`defineSettings` / `server.registerSettings` / `useSettings` / `settingsRpc`，`packages/plugin/src/settings.ts`、`client/contracts.ts`），用法与 `mono/` 一致。

## 数据

`shared/settings.ts`：

```ts
defineSettings({ id: "commands", scope: "host", version: 1,
  schema: z.object({ disabled: z.array(z.string()).default([]) }) })
```

存禁用列表而不是启用列表，新命令默认开启；未知名字忽略。

## 同步

- server：`server.registerSettings(COMMANDS_SETTINGS)`。
- client：`client/settings-store.ts` 保存当前禁用集合；启动时 `settingsRpc("commands").read` 读取；设置页 `useSettings` 拿到新值后写入 store。
- `registerCommands` 订阅 store：集合变化时注销全部命令再按 `COMMANDS` 顺序注册启用的命令，保持 autocomplete 顺序稳定。Paseo 注册表每次增删都会 publish 新快照，autocomplete 随之刷新。
- 其他设备上的修改在该客户端重新加载插件后生效（设置 API 无推送）。

## UI

`addSettingsScreen` 的 `title` 为 `Settings`、`icon` 为 `Settings`，与 Mono 相同；屏幕 `id` 仍为 `commands`。插件列表 Actions 菜单和设置页头都用这个 title。

`client/settings-screen.tsx`：`SettingsSection` "Slash commands" + `SettingsCard`，每个命令一个 `SettingsSwitch`（label `/name argumentHint`，hint 为 `details`）。加载失败 / invalid 显示 Reload / Reset，同 Mono。
