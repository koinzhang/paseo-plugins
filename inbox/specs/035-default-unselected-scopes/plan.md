# 035 Plan

- `shared/filter-settings.ts`：settings version 7，默认空数组；旧版本统一清除两个 scope 选择。
- `client/inbox-surface.tsx`：删除 `defaultScopeSelection` 初始化；选择只由用户点击、类型重置、选中请求和原有失效标签清理改变。
- `client/kind-filter-menu.tsx`：Project / Workspace 始终以空数组作为未选状态，不再等待 nullable 初始化。
- `server/store.ts`：空数组不再生成 `IS NULL` 条件，仅非空数组产生过滤条件。
- 删除只服务于默认全选的 helper 及其测试；更新设置、菜单和 SQLite 回归测试与相关文档。
