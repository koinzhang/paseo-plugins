# 007 · 隐藏侧栏分割线

## 目标

Web / Electron 下，选中 Mono Light 或 Mono Dark 时，隐藏以下分割线（与 005 的开关无关）：

- 左侧栏
  - 顶部：导航分组 `styles.sidebarHeaderGroup` 的 `borderBottom`（`components/left-sidebar.tsx`）
  - 底部：`SidebarFooter` 的 `borderTop`
- 右侧 Explorer（`workspace-explorer-sidebar`）
  - Files / Changes 标签栏下方：`styles.tabRailDivider`（`screens/workspace/explorer-sidebar.tsx`，绝对定位 1px 空 View）
  - 面板工具栏下方：`PaneContentToolbar` 的 `borderBottom`（`components/ui/pane-content-toolbar.tsx`）
- 中部区域
  - 顶部 header：`ScreenHeader` 内行 `styles.row` 的 `borderBottom`（`components/headers/screen-header.tsx`）
  - 工作区标签栏：`workspace-tabs-row` 的 `borderBottom`（桌面 `workspace-desktop-tabs-row.tsx` 与移动端 `mobileTabsRow`）
- 区域之间的竖线（只隐藏线，保留拖拽调整宽度与悬停高亮）
  - 左侧栏与中部：`styles.desktopSidebarBorder` 的 `borderRight`（`components/left-sidebar.tsx`）
  - 中部与 Explorer：`workspace-explorer-sidebar-resize-handle` 根节点的 1px 背景（`components/resize-handle.tsx`）
  - 中部分屏之间：`workspace-split-resize-handle`，同上

## 定位

- 左侧栏导航分组：导航按钮的最近公共祖先（复用 002 的分组查找）
- 左侧栏 footer：`sidebar-add-project` 与 `sidebar-settings` 的最近公共祖先
- Explorer 标签栏分割线没有 testID：从 `explorer-sidebar-tab-rail` 向上找，第一个「最后一个子元素为空、高度 ≤ 2px 且不包含标签栏」的祖先，其最后子元素即分割线；到达 `workspace-explorer-sidebar` 停止
- 中部 header 行没有 testID：在可见的 `composer-dock-header` 内，取第一个 computed `border-bottom-width` 非 0 且宽度等于 header 的后代
- 中部标签栏按 testID `workspace-tabs-row`
- 左侧栏右边线：从 footer 向上找第一个 computed `border-right-width` 非 0 的祖先
- ResizeHandle 按 testID 精确匹配，只把根节点背景设为透明；命中区与 `-highlight` 子节点不受影响
- Explorer 工具栏按 testID：`files-pane-header`、`changes-header`、`changes-repository-header`、`pr-pane-toolbar`、`commit-diff-header`、`file-panel-bar`，只在 Explorer 内生效

## 行为

- 只改颜色为透明，保留 1px 占位，不影响布局
- 切换非 Mono 主题或停用插件后恢复

## 非目标

- 中部面板内容区的工具栏分割线
- 移动端 compact Explorer
- iOS / Android

## 风险

- 宿主调整结构或 testID 后失效；失效表现为分割线重新出现

## 验收

- `npm run typecheck`、`npm test` 通过
- `paseo plugin reload mono` 后状态为 `running`
- Mono 主题下左侧栏顶部 / 底部分割线消失
- Mono 主题下 Explorer 标签栏下方与 Files / Changes 工具栏下方分割线消失
- Mono 主题下中部 header 与工作区标签栏下方分割线消失
- Mono 主题下左 / 中 / 右之间的竖线消失，拖拽调整宽度仍可用，悬停仍有高亮
