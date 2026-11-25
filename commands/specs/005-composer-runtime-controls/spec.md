# 005 Composer runtime controls

## 目标

把 `/model` `/effort` `/mode` 的运行时写操作迁移到 Paseo 公开的 `PluginComposer` API，移除这三条命令对插件 server、私有 `DaemonClient` 入口和额外 daemon 连接的依赖。命令参数、picker、provider 选项与当前值保持不变。

## 范围

- `/model` 使用 `composer.setModel(modelId)`。
- `/effort` 使用 `composer.setThinking(thinkingOptionId)`。
- `/mode` 使用 `composer.setMode(modeId)`。
- `/profile` `/feature` `/rename` `/cancel` 继续使用现有 server RPC，不在本次迁移。
- SDK 与 `requirements.paseo` 跟随当前运行时；最低主机版本提升为 Paseo 0.16.0。

## 行为

- 三条命令不向 agent 发送 prompt，不主动 cancel / interrupt / reload。
- Codex 在 agent 有活动 turn 时，mode / effort 沿用“下一轮生效”的提示。
- Claude 在 agent 有活动 turn 时，effort 沿用“下一轮生效”的提示。普通档位可能由 provider 立即接受，但仍不改变当前轮已使用的推理配置。
- 以上提示是插件根据已查证的 provider 行为补充的用户提示，不是 `PluginComposer` 的 provider notice 返回值。`/model` 不增加提示。
- Provider 对设置的拒绝继续通过 slash command 错误 toast 展示。

## 非目标

- 不修改 provider 的即时生效或下一轮生效逻辑。
- 不把 `/profile` 的批量配置改成多次 Composer 写入。
- 不迁移 `/feature` `/rename` `/cancel`，不改变其 RPC 契约。
- 不为所有 provider 编造统一的“下一轮生效”规则。

## 验收

- [x] 三条命令的运行时写路径不再调用 `commands.agent.control` 或 `DaemonClient`。
- [x] `/model` `/effort` `/mode` 的无参数 picker 与带参数解析单测保持通过。
- [x] 运行中 Codex / Claude 的补充提示有针对性单测；其他 provider 不误报。
- [x] `npm run typecheck` 与 `npm test` 通过。
- [x] `paseo plugin reload commands` 后插件为 running；日志无新增加载错误。
- [x] 在 Paseo 官方 Web 界面验证三条命令切换配置、不发送 prompt、不取消当前轮；Electron 原生窗口未单独复测。
