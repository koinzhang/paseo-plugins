# 012 · Plan

Paseo `diff-pane.tsx` 的 `ChangesHeader` 在 tree / combined 模式下总是渲染 `ChangesRepositoryToolbar`。`BranchSwitcher` 在 `currentBranchName` 为空时返回 `null`；桌面端没有 PR 时，trailing 容器也为空，但 `PaneContentToolbar` 仍占用 `WORKSPACE_SECONDARY_HEADER_HEIGHT`（36px）。

在 Mono Web 样式中，限定 `data-mono-chrome`、`workspace-explorer-sidebar` 和 `changes-repository-header`。当工具栏内没有 testID 标记的控件、按钮或链接时设 `display: none`，避免依赖 React Native Web 空 View 的具体 DOM 嵌套和 `:empty` 表现。该规则不影响其他主题、其他面板或有内容的仓库工具栏。关闭开关或卸载插件会移除样式。
