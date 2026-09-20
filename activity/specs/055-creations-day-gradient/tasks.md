# 055 — Tasks

## T1 渐变填充纯函数

- [x] T1.1 `significantCreationSlices` + `creationDayFill`（client/color-mix.ts）+ 单测
  - 验收：空 → `empty`；单色 → `solid`；Codex6/OpenCode1/Cursor24 → 渐变仅 Codex→Cursor（无 OpenCode 细缝）
  - 验证：`client/color-mix.test.ts`

## T2 直方图接线

- [x] T2.1 `agent-creations.tsx` 日柱改为单块渐变 / 纯色
  - 验收：无分段 View；高度按日总量；顶角 3px；空槽不变
  - 验证：typecheck；`paseo plugin reload activity-dev` running

## T3 收尾

- [x] T3.1 `npm run typecheck` + `npm test`（209 通过）
- [x] T3.2 `paseo plugin reload activity-dev` → running
- [x] T3.3 文档：051 §4.2 / 053 标注修订；specs/README；architecture；CHANGELOG
