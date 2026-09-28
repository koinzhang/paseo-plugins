# 028 — Tasks

- [x] 切换按钮去掉 tooltip
  - 验证：`client/surface.tsx` 不再传 `tooltip`（保留 `label` / `disabled` / `onPress`）；`npm run typecheck`、`npm test`（70 项）通过；`paseo plugin reload customize` 后 running。页面目视验收待完成（hover 无浮层、点击切换正常）。
- [x] 条目图标改为 14
  - 验证：`client/entry-row.tsx`、`client/entry-card.tsx` 使用 `ICON_SIZE.inline` 且图标容器 `paddingTop` 1 → 2；`design-tokens.test.ts` 无裸数值违规；`npm run typecheck`、`npm test` 通过。页面目视验收待完成（列表行 / 卡片图标与工具栏图标同高、与标题居中）。
