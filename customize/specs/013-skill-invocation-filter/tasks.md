# Tasks

- [x] `groupEntries` 在 Skills 上按全部 / 自动 / 仅手动过滤，并统计各档数量。`client/entries.ts`、`client/entries.test.ts`。过滤测试覆盖自动含 conditional、仅手动精确匹配、已禁用只留在全部，且规则分类忽略该参数。
- [x] Skills 搜索栏旁显示分段开关；筛掉当前预览时关闭预览。`client/surface.tsx`、`client/ui.tsx`、`shared/i18n.ts`。
- [x] 运行 Customize 测试、typecheck，并重载插件。46 项测试和 typecheck 通过；`paseo plugin reload customize` 为 running。Paseo 界面里的点击切换未做手动验证。
