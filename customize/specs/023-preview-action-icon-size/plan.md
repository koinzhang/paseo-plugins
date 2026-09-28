# 023 — Plan

- 现状：Open / Reveal 使用 `TextButton`，内部 `<Icon>` 取 `ICON_SIZE.inline`（14）；复制使用 `IconButton`，默认 `size = ICON_SIZE.action`（16），因此比同排文字按钮图标偏大。
- 改动：在 `client/preview-pane.tsx` 的复制 `IconButton` 上显式传 `size={ICON_SIZE.inline}`，并从 `./design-tokens.ts` 引入 `ICON_SIZE`。
- 按钮容器（`CONTROL.iconButton` 24×24）与 `hitSlop` 不变，点击区域与悬停反馈不受影响。
- 不新增 token；尺寸仍来自 `client/design-tokens.ts`，符合 `docs/design-system.md` 与 `client/design-tokens.test.ts` 的裸数值约束。
