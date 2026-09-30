# 011 任务

- [x] `client/panel-visibility.ts`：按 workspace 记录面板挂载；`client/panel-visibility.test.ts` 通过（`npm test` 42 pass）
- [x] `client/header-button.ts`：跟随 workspace 目录，每个 workspace 注册 icon-only header 按钮；面板挂载时 `visible: false`。`npm run typecheck` 通过
- [x] `WorkspaceInboxPanel` 上报挂载；`index.client.tsx` 注册并在 cleanup 中停止。`paseo plugin reload inbox` 后 running，日志无报错。App 内未点选验证
