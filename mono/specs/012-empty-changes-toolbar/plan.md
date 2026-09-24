# 012 · Plan

Paseo `diff-pane.tsx` 的 `ChangesHeader` 在 tree / combined 模式下总是渲染 `ChangesRepositoryToolbar`。`BranchSwitcher` 在 `currentBranchName` 为空时返回 `null`；桌面端没有 PR 时，trailing 容器也为空，但 `PaneContentToolbar` 仍占用 `WORKSPACE_SECONDARY_HEADER_HEIGHT`（36px）。

在 Mono Web 适配器中，限定 Explorer 内的 `changes-repository-header`。检查工具栏的实际 `textContent` 和可操作后代：有分支文字、PR 文字、带可访问名称的动作或按钮时保留该行；都没有时设置插件专用属性，由 CSS 设 `display: none`。这样不依赖 React Native Web 的 testID、role 透传或空 View 的 DOM 嵌套。DOM 更新时重新判定；关闭开关或卸载插件时移除属性。该规则不影响其他主题、其他面板或有内容的仓库工具栏。
