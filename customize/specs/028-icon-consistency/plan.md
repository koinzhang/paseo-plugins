# 028 — Plan

- `client/surface.tsx`：视图切换 `IconButton` 去掉 `tooltip` prop（保留 `label` 无障碍标签与 `disabled`）。
- `client/entry-row.tsx` / `client/entry-card.tsx`：类别图标 `size={ICON_SIZE.leading}` → `size={ICON_SIZE.inline}`；图标容器 `paddingTop` 1 → 2，14px 图标与 18px 标题行（状态胶囊撑高）垂直居中。
- `ICON_SIZE.leading` 保留在 token 文件（与 Activity 共享的角色表），不再被 Customize 使用。
