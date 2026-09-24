# 002 — Tasks

- [x] T1 从 Provider 快照筛选受支持且已启用的选项，补来源标记与选择回退
  - 验证：`client/provider-options.test.ts` 覆盖已禁用、已启用但未就绪、未知 ID、ACP 标记、保存项失效与旧快照缺失 source
- [x] T2 typecheck、测试、重载及运行状态验证
  - 验证：`npm run typecheck`、`npm test`（21 项通过）、`git diff --check`；`paseo plugin reload customize` 后 `paseo plugin ls` 为 running，日志有 `Plugin ready`
