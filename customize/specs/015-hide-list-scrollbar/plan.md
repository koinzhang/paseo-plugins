# 015 — Plan

- 沿用 Activity Explorer 面板的做法，在主列表 `ScrollView` 上设置 `showsVerticalScrollIndicator={false}`。
- Web 平台的滚动容器额外设置 `scrollbarWidth: "none"` 和 `msOverflowStyle: "none"`，避免浏览器滚动条占位。
- 只作用于 `client/surface.tsx` 的主列表容器。
