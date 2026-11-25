# Research

## 版本与工作副本锚点

- 仓库基线：`5326249867269f7cda3a70315d584a3da886a218`。
- 只读上游：`1ff119dc2a42825e7fdc46c504b6ccee52a4f8be`。
- `paseo --version` 实际输出 `0.17.4`（2026-11-25；命令伴随 Electron codesign 警告，但退出 0）。
- 起始 `commands/node_modules/@getpaseo/plugin/package.json` 为 `0.15.1`。起始已有 `package.json` 声明 0.17.4，与当时未更新的 `npm-shrinkwrap.json` 和 node_modules 不一致。
- 起始已有且来源未确认：`client/commands.ts`、`client/runtime-notice.ts`、`client/runtime-notice.test.ts`、`specs/005-composer-runtime-controls/`、`package.json`、`paseo-plugin.json`、`README.md`、`CHANGELOG.md`、`specs/README.md`。本次不认领、不修改、不回滚。
- 修复后检查时，外部已把 node_modules 中 `@getpaseo/plugin` / `@getpaseo/client` / `@getpaseo/protocol` 更新为 `0.17.4`，`npm-shrinkwrap.json` 也出现相应变更。本执行者没有运行安装、升级或锁文件更新命令，不认领这项变化；已告知主 agent 排查并发来源。

## Profile 的实际兼容问题

- `packages/protocol/src/agent-profile.ts:24-27`：旧 `featureValues` 为兼容字段，新字段为 `options`。
- `packages/app/src/agent-profiles/internal/materialize-profile.ts:22-28`：官方 app 读取 `profile.options ?? {}`；`:49-55` 用单次配置包写入 options。
- `packages/server/src/server/daemon-config-store.ts:229-233` 调用 `withLegacyProfileFeatureValues`；`packages/server/src/server/agent/option-controls.ts:215-220` 表明配置 API 目前同时返回 `options` 与同内容的 `featureValues`。
- 原 Commands `profileControl` 只读 `featureValues`，且 `PROFILE_KEYS` 不包含 `options`。当前主机的双字段返回虽然仍能应用兼容值，却会误报 `Ignored: options`；只有新字段的合法 profile 则会被判定为没有可应用配置。
- 修复优先读取上游已经归一化的 `options`，缺失才回退旧字段。空对象是有效的新字段，不复活旧值。
- `packages/protocol/src/messages.ts:2240-2247` 保留 `AgentConfigApply.featureValues` 为 options patch 兼容入口。继续使用现有 server RPC，不需要新 SDK 方法或依赖安装。

## SDK 审查与未采纳项

- `packages/plugin/src/client/contracts.ts:366-374` 与 `composer.tsx:30-62`：公开 command context 有 `composers(selector)`，Composer 有 `setModel` / `setMode` / `setThinking` / `setOptions`，返回 `Promise<void>`。
- `packages/app/src/composer/agent-composer/index.ts:334-341`：上述三个 setter 复用 app DaemonClient，但不返回 `setAgentMode` / `setAgentThinkingOption` 的 provider notice。现有 Commands server `runAgentControl` 会原样返回 notice；迁移并非完全等价。按任务边界不采用。
- `packages/client/src/index.ts:407-473`：公开 agent handle 有 `setOptions`，仍无 model / mode / thinking / title / cancel setter。`setOptions` 也返回 void，且本任务要求设置继续走 server DaemonClient，因此不替换 `/feature`。
- `packages/client/src/daemon-client.ts:4576-4618` 建议相关配置用单次 `applyAgentConfig`，以防其他 mutation 插入；provider 拒绝仍可能留下先前步骤已生效的配置，不宣称原子事务。保持 `/profile` 现有批量写法。
- `packages/plugin/src/client/contracts.ts:419-431` 的 slash 注册契约与当前代码一致。`packages/app/src/plugins/client-slash-commands/model.ts:62-69` 捕获同步异常和 Promise rejection；Commands 现有抛错反馈可保留。
- `public-docs/plugins/migration.md` 的 client/server 编译边界和 `/client/ui` 导入要求已满足。`public-docs/plugins/hooks.md` 的 `addHook` 与弃用旧 on/before 不影响 Commands，因为插件没有生命周期 hook，不做机械迁移。
- `/resend` 现有 `timeline.refetch` 的 projected tail/before 分页与公开 `agent.send(text)` 保持不变；不改为自动 retry hook，避免额外 turn 或重放副作用。
- 设置仍用 `defineSettings` / `registerSettings` / `settingsRpc` / `useSettings`。没有依据把逐个命令启停改成额外状态框架。

## 验证记录

- 修改前 `npm run typecheck`：退出 2，`client/commands.ts(174,28): TS2339 Property 'composers' does not exist on type 'Context'`。根因是起始已有 005 使用新公开契约，而实际 SDK 为 0.15.1；本次不安装依赖或改动该迁移。
- 修复后 `npm run typecheck`：实际退出 0，无诊断输出。同期只读回查 node_modules 为 0.17.4，锁文件亦被外部更新；不能把前述 Composer 错误消失归功于本次 profile 读取修复，也不据此认定任务外 005 已完成交互验收。
- 新增纯函数回归测试及修复后验证结果见 `tasks.md`。

## 交付风险

- 仍使用 `features` / `featureValues` 兼容数据面。上游注释明确计划在 2027-05-01 后删除；本次最小修复不承担完整 controls/options 与写契约迁移，后续需另行授权并验证。
- `specs/README.md` 有起始来源未确认变更且被要求保留，所以未加入 006 索引；主 agent 可在完成来源核对后单独补齐。
- 完整测试和桌面 `/profile` 交互、daemon 广播同步、单独命令启停未在本次执行；主 agent 统一验收与 reload。
