# 依据

- `shared/category-visibility.ts` 的 `resolveCategory` 已按可见分类列表判断：目标仍在列表中则返回目标，否则返回第一项。可见顺序与 `CATEGORIES` 一致，第一项通常是 Instructions。
- 切换前的实现把每个 Provider 的上次分类存在模块级 `lastCategory`，缺省全是 Instructions。因此切到尚未手动选过的 Provider 时，即使该 Provider 有当前分类，也会回到 Instructions。
- Project 选择存在 host settings，分类选择只在 Surface 状态中；Project 变化不会卸载 Surface。
