# 086 — 适配 Paseo 0.15（插件 SDK 0.15.1）

## 背景

本仓库五个插件的 `@getpaseo/plugin` 仍固定在 0.9.x（activity 0.9.0-beta.2），而宿主已到 0.15。0.10–0.15 之间插件 API 有多次变更：

- 0.11：新增 screens（`addScreen`）与 sidebar header/footer items；`addSurface` / `addSidebarItem` 标记 deprecated
- 0.12：`@getpaseo/protocol/*` 纯类型导入免本地安装
- 0.13：UI 入口统一为 `@getpaseo/plugin/client/ui`（`/client/react-native` deprecated）；面板统一 `params` / `revision` / `tab`，新增 `addAgentPanel`，`context` 与 `agentId` props deprecated；**turn-ended hook 的 `timeline` 变为空数组**，改用 `timeline.refetch`
- 0.14：lifecycle 钩子改名（`agent.created` → `agent.create.after` 等），`server.on` / `server.before` deprecated，统一 `server.addHook`
- 0.15：`worktree.create.before` / `worktree.create.after`、更小的 client bundle 与跨启动缓存

## 目标

- 五个插件依赖对齐 `@getpaseo/plugin@0.15.1`（`@getpaseo/client@0.15.1` 仅 commands / inbox 需要），`requirements.paseo` 声明 `>=0.15.0`。
- 移除对 deprecated API 的使用：`addSurface` / `addSidebarItem` / `openSurface` / `server.on` / `client/react-native` / 面板 `context` 与 `agentId`。
- 修复 0.13 起 `agent.turn.after` 的 `timeline` 恒为空导致的实时采集失效：钩子内用 `timeline.refetch` 读回尾部历史再入库。
- 文档与 CHANGELOG 记录新版本要求与安装命令（0.11 起 `paseo plugin add owner/slug` 走 registry，GitHub 源写 `github:owner/repo:path`）。

## 非目标

- 不迁移到 0.13 的运行时翻译（`defineTranslations` / `client.i18n`）：activity 与 customize 的 `shared/i18n.ts` 暂保持现状（Web 端读 app 语言）。
- 不采用 `useTabState`、`Markdown`、`addFilePanel`、usage sources、provider 相关新能力。
- 不改动业务行为、数据模型与 RPC 契约（`usage.*` 名称不变）。
- 不发版（版本号与 tag 由发布流程处理）。

## 用户故事

1. 作为已升级到 Paseo 0.15 的用户，安装本仓库插件不再触发 deprecated API 告警，且侧边栏入口、面板、命令与 0.9 时表现一致。
2. 作为 activity 用户，一轮对话结束后工具调用仍立即入库，不需要等 5 分钟后台巡检。
3. 作为维护者，五个插件的 SDK 版本、`requirements.paseo` 与文档声明保持一致。

## 验收标准

- 五个插件 `npm run typecheck` 与 `npm test` 全绿。
- 仓库内不再出现 `client/react-native`、`addSurface`、`addSidebarItem`、`openSurface`、`server.on(`、`server.before(`。
- `paseo plugin reload <id>` 后 activity / commands / customize / inbox 为 `running` 且无 error；mono 以临时 ID 安装验证可加载后移除。
- activity 日志出现 `turn.after ... rows=N`（一轮对话后实时入库）。
- 文档：五个 README 的 Paseo 版本要求与 GitHub 安装命令、CONTRIBUTING 前置条件已更新。
