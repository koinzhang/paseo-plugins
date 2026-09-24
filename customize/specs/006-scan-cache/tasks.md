# 任务

- [x] 调整查询缓存、挂载刷新和已有数据的错误呈现。验证：Provider/Project 查询键保持独立；有数据的刷新错误不再替换列表。
- [x] 验证首次加载、缓存切换、刷新失败；运行类型检查和测试。验证：`client/query-policy.test.ts` 覆盖缓存立即显示、初次加载和刷新失败；`npm run typecheck`、`npm test`（31 项通过）。
- [x] 重载 Customize，确认本机实例运行正常。验证：`paseo plugin reload customize` 返回 `running`，无错误。
