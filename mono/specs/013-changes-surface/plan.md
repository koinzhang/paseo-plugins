# 013 · Plan

宿主 `explorer-sidebar.tsx` 的内容容器使用 `theme.colors.surfaceSidebar`。`PaneContentToolbar` 默认填充 `surface0`，Changes 的 `changesToolbarSidebar` 仅在 tree 呈现时覆盖为 `surfaceSidebar`，所以其他呈现模式的两行工具栏会与 Explorer 底色不同。

Mono Web 样式以 `workspace-explorer-sidebar` 限定作用域，随插件加载而生效，不依赖选中的应用主题。将 `changes-repository-header` 与 `changes-header` 的背景设为透明，让 Explorer 内容容器的底色透出。对 `forge-setup-callout` 设置 `display: none`；该 testID 只用于 Changes 的 git host 设置提示。保留 012 的空工具栏判定与所有控件。
