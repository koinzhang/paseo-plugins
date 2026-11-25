# 024 Plan

- 只改 `inbox/index.client.tsx`、`inbox/client/inbox-surface.tsx`、`inbox/client/kind-filter-menu.tsx` 的图标名。
- 沿用 Paseo 宿主的 Lucide 动态解析，不引入图标组件、SVG 或 npm 依赖。
- 离线检查通过后重载 Inbox；实际视觉由用户确认。
