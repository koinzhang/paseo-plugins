# Tasks

- [x] 查证 agent 改名与 `workspaces.ref().setTitle`；见 `research.md`。
- [x] `planRename` 解析默认 tab、`-t`/`--tab`、`-w`/`--workspace` 与 `--`；`shared/commands.test.ts` 覆盖。
- [x] `/rename` 在 client 按目标调用现有 agent RPC 或 SDK `setTitle`。
- [x] 更新 README、changelog 与设置说明。
- [x] `npm run typecheck`、`npm test`（41 项通过）、`paseo plugin reload commands` 后 `paseo plugin ls` 为 running，日志为 Plugin ready。
- [ ] 桌面 app 手动验证 tab 与 workspace 改名。
