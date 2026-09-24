# 002 — 已启用 Provider 筛选与来源标记

## 目标

- Provider 下拉框只列出 Paseo 当前 host 中已启用、且 Customize 有扫描规则的 Provider。
- 每个下拉选项在名称后显示来源类型：Built-in 或 ACP（中文界面显示「内置」或 ACP）。
- 若上次保存的 Provider 已禁用，看板使用第一个仍可选的 Provider；启用状态变化后刷新列表。
- 没有任何受支持且已启用的 Provider 时显示空状态，不扫描被禁用的 Provider。

## 边界

Customize 当前支持 Claude、Codex、Cursor、Copilot、OpenCode、Pi、Oh My Pi 的扫描规则。其他自定义 Provider 即使已启用，也不能套用未知的文件发现机制，故不出现在看板选项中。`enabled` 与运行状态 `ready` 不同：已启用但暂时不可用的 Provider 仍可查看本机配置。

## 验收

- [ ] 禁用的受支持 Provider 不出现在下拉列表；已启用但 `status` 非 `ready` 的 Provider 仍可选。
- [ ] 已启用的内置 Provider 显示 Built-in / 内置；Cursor ACP 显示 ACP。
- [ ] 上次保存的 Provider 被禁用时看板选中其他已启用选项，且不会扫描被禁用者。
- [ ] 没有可选 Provider 或快照加载失败时有明确状态及重试入口。
- [ ] `npm run typecheck`、`npm test` 通过，插件 reload 后 `running`。
