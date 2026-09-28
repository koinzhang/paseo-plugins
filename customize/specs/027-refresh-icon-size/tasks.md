# 027 — Tasks

- [x] 工具栏刷新图标 16 → 14
  - 验证：`client/surface.tsx` 的 Rescan `IconButton` 增加 `size={ICON_SIZE.inline}`；`npm run typecheck`、`npm test`（70 项）通过；reload 后截图量得刷新字形 24×24 物理像素（=14px 图标），与搜索字形一致，箭头 / 机制图标同为 14。
