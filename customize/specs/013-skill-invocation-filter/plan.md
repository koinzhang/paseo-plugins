# 013 — Plan

- 过滤留在客户端。`Entry.status` 已区分 `auto`、`conditional`、`manual`、`disabled`、`inactive`、`pending`。
- `client/entries.ts` 增加 `matchesSkillInvocation` 与 `countSkillInvocation`。`groupEntries` 在分类为 skills 时再按调用方式过滤，其他分类忽略该参数。
- `surface.tsx` 用本地 state 保存 `all | auto | manual`，默认 `all`。只在 Skills 且该分类可扫描时，把分段控件放在搜索框右侧。窄屏时搜索框与控件换行。
- 分段控件放在 `client/ui.tsx`，高度对齐 `CONTROL.searchHeight`，选中项用 `surface2` 底。文案进 `shared/i18n.ts`。
- 预览中的 skill 不再匹配当前档位时清空选中。
