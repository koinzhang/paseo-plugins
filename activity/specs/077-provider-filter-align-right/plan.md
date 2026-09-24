# Plan

改动最小，只调布局，不动行为：

1. `client/global-surface.tsx` — `filterRow` 增加 `justifyContent: "flex-end"`，把唯一的子项（`ProviderDropdown`）推到内容区右侧。
2. `client/provider-dropdown.tsx` — 浮层锚点由 `left: 0` 改为 `right: 0`：触发器右对齐后，菜单与触发器右边缘对齐向左展开，避免菜单向右溢出页面。
3. `docs/design-system.md` §6 — 记录 Provider 下拉为「触发器下方、右对齐展开」。

无新增 token / 文案；`filterRow` 的其他样式（`position: relative`、`zIndex: 20`）保持，菜单层级不变。
