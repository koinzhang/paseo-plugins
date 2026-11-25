# 017 Plan

## 方法与验证

1. 核对主 checkout、inbox 改动、上游 commit、安装依赖与运行时版本。验证：`git rev-parse HEAD`、范围内 `git status`、package manifests、`paseo --version`。
2. 阅读 migration / hooks、现有 spec 和实际调用路径。验证：对照 SDK 导出、client 实现、app 缓存来源、protocol 与 daemon handler，而非只看接口名称。
3. 评估候选改进。验证：分别检查是否保留 archived/missing 区分、project identity、恢复顺序、分页预算与跨 host 隔离；新契约 / 安装依赖不在本轮执行范围。
4. 只记录审查结果。验证：完整 inbox diff 与 untracked 文件清单；运行时代码、package.json、package-lock.json、manifest 与数据库均无变更。
5. 运行类型检查和最小现有测试。验证：命令退出码、通过数量与覆盖说明写入 `tasks.md`；完整测试和 GUI 验收交主 agent 串行执行。

## 不做迁移的边界

- SDK 0.17.4 的新导出不能用现有 0.15.1 类型检查证明正确；不能只更新 version 字段却声称完成适配。
- 缓存 hooks 是活动实体投影，Inbox 包含已归档与已删除实体的历史收藏，仍需服务端读取。
- 不把 `reload()` 当作无副作用的读取，也不把 `refresh()` 当作反归档。
- `wholeTurns: true` 会扩展单页到整轮，改变现有最多 5 × 80 行预算；本轮不改变 007 的历史读取语义。
- 原有内部 recovery 仍有版本耦合；已验证差异交主 agent 决定，不绕过禁止安装依赖的限制。
