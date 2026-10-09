# 018 · Research

- 上游源码锚点：`718ed932b7843cde0b156ff30ec6adf42e828a18`（paseo 0.11.1 · main · 2026-10-09）
- 运行时：`paseo --version` = 0.11.1；`requirements.paseo` = >=0.9.0
- `packages/app/src/components/left-sidebar.tsx`：`styles.footerContainer` 有 `borderTopWidth: 1`，testID `sidebar-footer`。`SidebarFooterRows` 在 Usage 或插件行可见时，于行下渲染 `SidebarSeparator`，testID `sidebar-footer-separator`。图标行 testID `sidebar-footer-bottom-line`，样式 `sidebarFooter` 无边框。
- `packages/app/src/components/sidebar/sidebar-separator.tsx`：1px `borderBottom`，颜色 `theme.colors.border`。
- `packages/app/src/usage/sidebar-item.tsx`：Usage 摘要行 testID `sidebar-usage`，自身无分隔线。
