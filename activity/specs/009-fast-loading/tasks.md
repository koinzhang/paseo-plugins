# Tasks

- [x] T1 查询移除同步依赖，后台维护 agent 目录。
  - 验证：`server/handlers-query.test.ts`；`background-sync` 目录 upsert / stop 后不写库；`npm run typecheck`
- [x] T2 Popover 复用 Pill 缓存，刷新保留内容。
  - 验证：`useUsagePillData` + `pill-data-cache`；`client/pill-data-cache.test.ts`；Popover/全局仅冷启动转圈
- [x] T3 回归测试、typecheck、reload 与运行状态验证。
  - 验证：`npm test`；`npm run typecheck`
