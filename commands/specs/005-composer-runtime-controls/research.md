# Research

版本锚点：Paseo `1ff119dc2a42825e7fdc46c504b6ccee52a4f8be`（`paseo --version` 0.17.4，2026-11-25）。

## 公开写 API

- `packages/plugin/src/client/contracts.ts` 的 `PluginCommandCapabilities` 提供 `composers(selector)`，slash command 的 agent context 可直接使用。
- `packages/plugin/src/client/composer.tsx` 的 `PluginComposer` 提供 `setModel(modelId)`、`setMode(modeId)`、`setThinking(thinkingOptionId)`，均返回 Promise。
- `public-docs/plugins/reference.zh-CN.md` § 按引用访问 composer：运行中 agent 无论 tab 是否打开都有 composer；结果为空或一个；provider 拒绝设置时 Promise 拒绝。
- `packages/app/src/composer/agent-composer/index.ts` 显示 Composer 最终仍调用 daemon 的 `setAgentModel` / `setAgentMode` / `setAgentThinkingOption`。迁移删除插件自己的私有连接，不改变 provider 设置语义。
- `CHANGELOG.md` 0.16.0 将 Plugin composer controls 与修改 agent settings 列入该版本功能；`requirements.paseo` 需提升到 `>=0.16.0`。

## 生效与提示

- `packages/server/src/server/agent/providers/codex-app-server-agent.ts`：有活动前台 turn 时，`setMode` / `setThinkingOption` 返回 `Permission mode applies next turn` / `Thinking level applies next turn`；仅更新配置，不调用 interrupt。
- `packages/server/src/server/agent/providers/claude/agent.ts`：普通 effort 档位经运行中 query 的 `applyFlagSettings` 更新；活动 turn 时返回 `Thinking level applies next turn`。`ensureQuery` 在前台 query 活跃时保留它，待后续再处理需重启的 launch 配置。
- `packages/server/src/server/daemon-e2e/claude-settings-mid-turn.real.e2e.test.ts` 覆盖 effort 与 mode 修改后前台 Claude 命令继续完成。
- `PluginComposer` 的三个 setter 返回 `Promise<void>`，不像 `DaemonClient` setter 返回 `AgentProviderNotice`。插件只在已查证的 Codex / Claude 组合补充相同英文提示；其他 provider 不推断。
- 插件的 `AgentState.status` 来自刚刷新的 agent snapshot。新实现把运行状态对应的提示作为 client 端补充信息，不宣称它是 Composer 返回值。

## 保留边界

- `PaseoAgentHandle` 仍没有 model / mode / thinking 的设置方法；应使用 Composer 而不是自行扩展 agent handle。
- `/profile` 需要一次 `agent.config.apply` 保持设置包语义；`/feature` 与 `/rename` / `/cancel` 不属于本次 Composer 迁移，继续保留现有 RPC。
## 真实浏览器验收（2026-11-25）

- 使用 Paseo 官方 Web 界面连接本机 0.17.4 daemon，在隔离 Agent `2cce5163-2ac1-4148-95c1-ad4447fc1d13` 运行无害 `sleep` 任务。
- `/model` 选择当前 Kimi K3.1 Pro、`/effort` 选择当前 low、`/mode` 选择 Default Permissions，菜单均关闭且未发送 prompt；每轮 sleep 任务正常结束，Agent 未中断。
- `/model` `/effort` `/mode` 只打开菜单后按 Escape 的三次检查，均保持运行；详见 `007-picker-escape`。
- `npm run typecheck` 通过；`npm test` 77/77 通过；插件重载后 `running`，日志 `Plugin ready`。
