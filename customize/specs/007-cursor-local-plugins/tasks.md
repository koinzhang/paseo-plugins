# 任务

- [x] 扫描 Cursor 本地测试插件目录并验证标准/专有格式。验证：`server/providers.test.ts` 覆盖标准、专有及无效根清单。
- [x] 在本机 Cursor 本地目录创建最小标准演示插件并验证其清单和 Skill。验证：真实扫描返回用户级条目 `customize-agent-plugins-demo`，规范版本 `1.0.0`、校验状态 `valid`；Skill `demo-greeting` 被发现。
- [x] 运行类型检查、测试、真实扫描，重载 Customize。验证：`npm run typecheck`、`npm test`（32 项通过）；`paseo plugin reload customize` 返回 `running`。
