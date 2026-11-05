# 086 — tasks

- [x] T1 spec / plan / 索引 — 验证：本目录与 `specs/README.md` 行存在
- [x] T2 五个插件 bump `@getpaseo/plugin@0.15.1`、`@getpaseo/client@0.15.1`（commands / inbox）并 `npm install` — 验证：`package.json`、`npm ls @getpaseo/plugin`
- [x] T3 UI 入口 `client/react-native` → `client/ui`（26 个文件） — 验证：仓库内无残留引用
- [x] T4 activity：`addScreen` / `addSidebarHeaderItem` / `addAgentPanel` / `params.agentId` / `openScreen` — 验证：typecheck
- [x] T5 customize / inbox：screens、sidebar item、`openScreen`（含 customize slash-command 与单测） — 验证：typecheck + `npm test`
- [x] T6 activity：`server.on` → `server.addHook`，turn.after 用 `timeline.refetch` 替代空 `event.timeline`（抽到 `server/turn-ingest.ts`） — 验证：typecheck；`server/turn-ingest.test.ts` 5 个用例覆盖 refetch 参数、入库、终态跳过与 createdAt 保留
- [x] T7 `requirements.paseo` → `>=0.15.0`（五个插件） — 验证：`paseo-plugin.json`
- [x] T8 文档：README 版本要求与 GitHub 安装命令、CONTRIBUTING 前置条件 — 验证：`grep github:koinzhang`
- [x] T9 全量校验：五个插件 typecheck + test；四个已安装插件 reload；mono 临时 ID 安装验证后移除 — 验证：`paseo plugin ls` 全 running
- [ ] T10 实机验收：一轮对话后 activity 日志出现 `turn.after agent=… rows=N`；侧边栏入口、面板与 Command Center 项可正常打开 — 验证：Paseo UI + `paseo plugin logs activity`
