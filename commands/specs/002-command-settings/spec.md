# 002 · Command settings

## 目标

- Paseo Settings 里新增 Commands 设置页，插件 Actions 菜单项与页头为 **Settings**（图标 `Settings`），对齐 Mono。页内逐个开关 `/model` `/effort` `/profile` `/mode` `/feature` `/rename` `/cancel`。
- 每个开关带说明：命令作用、无参数与带参数时的行为。
- 设置页按功能分成多块 `SettingsSection`，标题对齐 Mono（只显示标题，不加说明）：**Runtime**（`/model` `/effort` `/profile` `/mode` `/feature`）、**Session**（`/rename` `/cancel`）、**Prompt**（`/resend`）。
- 关闭的命令不注册：不出现在 slash autocomplete，输入后按 Paseo 原有优先级交给 provider（或当作普通消息）。

## 非目标

- 不按 agent / provider 区分开关（Paseo 插件设置只支持 host scope）。
- 不改命令名、不支持别名配置。

## 验收

- [ ] 设置页列出 7 个命令，默认全部开启。
- [ ] 关闭某命令后立即从 autocomplete 消失，重新开启后恢复；刷新 / 重载插件后状态保持。
- [ ] 以后新增的命令默认开启（设置里存的是禁用列表）。
