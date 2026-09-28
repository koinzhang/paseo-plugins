# 023 — 预览详情页复制图标尺寸对齐

## 目标

- 预览详情页（点开某条配置后）顶部操作行的复制图标，与同一行的 Open / Reveal 图标视觉尺寸一致。
- 保持复制按钮的点击区域、悬停反馈、tooltip（accessibilityLabel / hint）行为不变。

## 非目标

- 不改 Open / Reveal / Close 的图标尺寸与文字按钮样式。
- 不改其他页面（列表行、工具栏等）的 IconButton 尺寸。

## 验收

- 复制图标与 Open / Reveal 图标渲染尺寸相同（均取 `ICON_SIZE.inline`）。
- `npm run typecheck`、`npm test` 通过（含 `design-tokens.test.ts` 的裸数值拦截）。
