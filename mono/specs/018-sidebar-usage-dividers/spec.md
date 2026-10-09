# 018 · 隐藏侧栏 footer Usage 上下分隔线

## 问题

Paseo 0.11 把 Usage 摘要放进左侧栏 footer，夹在两条线之间：

- 上方：`footerContainer`（`data-testid="sidebar-footer"`）的 `borderTop`
- 下方：Usage 行与底部图标行之间的 `SidebarSeparator`（`data-testid="sidebar-footer-separator"`）的 `borderBottom`

007 把 footer 顶边标在 `sidebar-add-project` 与 `sidebar-settings` 的最近公共祖先上。0.11 里这个祖先是没有边框的图标行 `sidebar-footer-bottom-line`，顶边已经挪到外层 `sidebar-footer`。Hide dividers and borders 因此盖不住 Usage 上下这两条线。

## 目标

- Web / Electron 开启 Hide dividers and borders 时，上述两条线颜色透明，保留 1px 占位。
- 没有 Usage 摘要时，footer 顶边同样透明（007 的底部分割线）。
- 关闭开关或卸载插件后恢复宿主颜色。
- 0.11 之前没有 `sidebar-footer` testID 的宿主，仍由 007 的祖先标记隐藏 footer 顶边。

## 非目标

- 不改 Usage 摘要、底部图标行，或 Paseo 宿主源码。
- 不新增开关；沿用 Hide dividers and borders。
- iOS / Android。

## 验收

- `npm run typecheck`、`npm test` 通过，插件重载后状态为 `running`。
- 开启开关时，Usage 摘要上下没有可见分隔线；关闭开关后两条线恢复。
