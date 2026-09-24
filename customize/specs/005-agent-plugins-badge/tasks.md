# 任务

- [x] 实现 Agent Plugins 1.0 根清单识别及 Provider 扫描。验证：`server/providers.test.ts` 覆盖 Codex 项目、直接安装、缓存，Cursor 标准/专有双清单和 Gemini 标准/专有扩展。
- [x] 添加列表标识和中英文文案。验证：`npm run typecheck` 通过，格式信息经 RPC 类型契约传到 UI；预览元数据保留标识。后续改为带版本的 `agentPlugin` 字段，见 008。
- [x] 验证类型检查、测试与插件重载。验证：`npm run typecheck`、`npm test`（30 项通过）；`paseo plugin reload customize` 返回 `running`；本机 Codex 扫描发现 18 个缓存插件条目。
