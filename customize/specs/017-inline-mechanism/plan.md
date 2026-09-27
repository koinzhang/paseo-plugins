# 017 — Plan

- `client/surface.tsx` 将 `MechanismCard` 移入分类工具栏的右侧控件组，放在 `SegmentedControl` 之后、搜索框之前；不支持扫描时只显示机制入口。
- `client/mechanism-card.tsx` 使用和搜索框同高的按钮；点击后仿照 `Dropdown`，在按钮下方绝对定位展示原有机制文本和路径，不改变列表高度。
- 浮层沿用 `Dropdown` 的边框、底色、阴影和外部点击关闭方式；内部内容超长时单独滚动。
- 保留按 Provider / 分类重置展开状态的现有 key。
