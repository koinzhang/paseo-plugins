# 任务

- [x] 实现版本化快照读写、过期判定与路径重新校验。验证：`server/scan-snapshot.test.ts` 覆盖快照往返、10 分钟边界、文件权限、版本/损坏回退和预览前的实时扫描校验。
- [x] 更新客户端查询流程和文档。验证：`client/query-policy.test.ts` 覆盖新鲜/过期快照的扫描决策与新旧结果选择；README 说明存储位置与刷新行为。
- [x] 验证真实扫描、类型检查、测试并重载插件。验证：临时 `PASEO_HOME` 的 Codex 实扫写入并读回 178 条快照；`npm run typecheck`、`npm test`（35/35）通过；`paseo plugin reload customize` 返回 running，日志显示 Plugin ready。
