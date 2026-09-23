# 065 — Tasks

- [x] T1 盘点字号 / 间距 / 圆角 / 图标 / 状态样式 — 验证：spec §1 表（`rg` 统计 `client/**/*.tsx`）
- [x] T2 `client/design-tokens.ts` — 验证：typecheck
- [x] T3 Global surface + 三个图表 + KPI 接入 token — 验证：typecheck；§4 取值对照
- [x] T4 Agent panel + 两个 composer popover 接入 token — 验证：typecheck；两 popover 行样式同源（`TEXT.rowTitle` / `meta` / `count`、`ROW_PADDING.dense`）
- [x] T5 Workspace panel 及子组件接入 token；删 `MENU_OPTION_ICON_SIZE`、3 处 `MONO` — 验证：typecheck；`rg` 无残留引用
- [x] T6 `design-tokens.test.ts` 入 `npm test` — 验证：233 tests pass；临时注入 `fontSize: 14` 的探针文件时测试失败并指出行号
- [x] T7 `docs/design-system.md`；README 索引、architecture、AGENTS.md 指向规范 — 验证：链接可达
- [x] T8 reload — 验证：`paseo plugin reload activity` 后 running
- [ ] T9 页面目测（regular + compact）：三面节标题 / 节奏、两 popover、两 tooltip — 待真机
