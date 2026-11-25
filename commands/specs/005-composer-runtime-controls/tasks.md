# Tasks

- [x] 查证 Paseo 0.17.4 的 Composer 命令上下文、版本要求与 provider 生效语义，记录 `research.md`。
- [x] `/model` `/effort` `/mode` 改用 `PluginComposer`，保留其他 RPC 命令；见 `client/commands.ts` 的 `runtimeRunner`。
- [x] 为 Codex / Claude 的运行中配置提示增加纯函数与单测；见 `client/runtime-notice.ts` 与 `client/runtime-notice.test.ts`。
- [x] 升级 SDK、manifest、README 与 changelog 的兼容说明。
- [x] 运行 typecheck、完整单测，reload 插件并检查 running 状态和日志。
- [x] 在隔离临时 agent 上验证实际设置与 turn 行为；见 `research.md` 的真实浏览器验收。
