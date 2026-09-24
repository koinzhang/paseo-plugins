# 任务

- [x] 从 `$schema` 提取版本并分离已支持校验与未知版本声明。验证：`server/providers.test.ts` 覆盖 1.0.0、0.9.0、2.0.0、无效 URL 和清单。
- [x] RPC 与列表/预览展示动态版本及未校验状态。验证：`client/entries.test.ts` 覆盖中英文版本文案；`npm run typecheck` 通过。
- [x] 验证测试、类型检查、实际 demo 扫描与插件重载。验证：`npm test` 32/32、`npm run typecheck`、Cursor 本地 demo 扫描返回 `1.0.0/valid`，`paseo plugin reload customize` 显示 running。
