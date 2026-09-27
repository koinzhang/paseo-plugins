# 016 — Plan

- `client/surface.tsx` 将现有顶部控制区放在主列表 `ScrollView` 前，作为同一个弹性容器的固定子元素。
- `ScrollView` 设置 `flex: 1` 和 `minHeight: 0`，仅包裹 Project/User 内容及其加载/错误状态。
- 将原有页面内边距拆分给固定控制区和滚动列表，保持视觉间距；保留顶部区 `zIndex`，使下拉菜单显示在列表上方。
