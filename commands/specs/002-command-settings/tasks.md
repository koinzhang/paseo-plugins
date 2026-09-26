# Tasks

- [x] `shared/settings.ts` 设置定义 + server 注册。`npm run typecheck` 通过。
- [x] `COMMANDS` 增加 `details` 说明；按设置动态注册 / 注销命令（`client/settings-store.ts` + `registerCommands` 订阅）。
- [x] 设置页 `client/settings-screen.tsx`。Actions 菜单项与页头为 `Settings`，图标 `Settings`，对齐 Mono。命令按 Runtime / Session / Prompt 分成带标题的 `SettingsSection`。
- [x] `npm run typecheck` / `npm test`（35 pass）通过；`paseo plugin reload commands` 后 running，日志 Plugin ready。
- [ ] 桌面 app 手动验证开关即时生效。
