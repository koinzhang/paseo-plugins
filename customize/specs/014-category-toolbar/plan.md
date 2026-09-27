# 014 — Plan

- 在 `client/surface.tsx` 中以可换行横向容器包住 `CategoryTabs` 和右侧控件。
- 右侧控件先渲染 Skills `SegmentedControl`，最后渲染固定宽度的搜索框；容器占据剩余宽度并右对齐。
- 移除机制说明下方原有的搜索与筛选行，不改过滤状态或组件语义。
