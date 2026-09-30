# 012 任务

- [x] `shared/contracts.ts`：`Item.workspaceLabel`；`items.list` 加 `inboxOf`、`archived`，汇总带 `archived`；`items.save` 改为 `workspaceId` / `projectOfWorkspace`；新增 `items.tag`、`tags.options`；`agents.star` 去掉 `workspaceId`。`npm run typecheck` 通过
- [x] `server/store.ts`：`workspace_label` 列迁移；agent 按快照回填 workspace；`inboxOf` 过滤；`setTags` / `refreshLabels`；不再隐藏归档 workspace；重复收藏不移动。`server/store.test.ts` 覆盖
- [x] `server/directory.ts`：活动 project / workspace → Inbox project key。用本机 daemon 实测：4 个 project 的 key 与库中已有条目一致，旧 agent 条目回填了所在 workspace
- [x] `server/tags.ts`：标签一致性校验；`server/tags.test.ts` 覆盖跨 project 拒绝、只选 workspace 自动带 project、归档标签可保留不可新选
- [x] `server/handlers.ts`：list / save / tag / options / star / candidates 按 plan 实现
- [x] `/inbox` 去掉 `-w`：`shared/slash-command.ts` 只 trim，单测更新；`index.client.tsx` scratch 打当前 project 标签，⌘K 新建笔记同样
- [x] Client：面板用 `inboxOf`；列表副标题 / 详情标签 / 筛选 chip 对归档项加删除线；详情内 `TagEditor` 编辑 note / scratch 标签，agent 只读。`npm test` 47 pass，`paseo plugin reload inbox` 后 running、日志无报错
- [ ] App 内点选验收（spec 验收各项）：未在 UI 中手动验证
