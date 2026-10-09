# 018 · Plan

宿主 `left-sidebar.tsx`（Paseo 0.11.1）：

```
sidebar-footer          footerContainer.borderTop
  footer rows           Usage 摘要与插件行
  sidebar-footer-separator   SidebarSeparator.borderBottom
  sidebar-footer-bottom-line 图标行，无边框
```

`SidebarSeparator` 是空 View，线画在 `borderBottom` 上。

`LAYOUT_CSS` 在 `html[data-mono-chrome]` 下：

- 给已有的 footer 顶边规则加上 `[data-testid="sidebar-footer"]`，`border-top-color: transparent`
- 新增 `[data-testid="sidebar-footer-separator"]`，`border-bottom-color: transparent`

两条规则都只改颜色。`data-mono-chrome` 由 `minimalChrome` 控制，样式节点在卸载时移除，旧宿主的祖先标记保持不变。
