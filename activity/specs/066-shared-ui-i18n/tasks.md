# 066 — Tasks

- [x] T1 `client/ui.tsx` 公共组件 — 验证：typecheck；`design-tokens.test.ts` 无裸样式数值
- [x] T2 Global surface / 三个图表 / 两个 popover / Agent panel / Workspace panel 及子组件接入公共组件；删除各文件本地 `CountText` / `TextTabs` / `CountBadge` / `rankTitle` 等重复实现 — 验证：typecheck；未用导入扫描为空
- [x] T3 `ChartTooltip` 统一三图；Timeline 去 readout 行 — 验证：typecheck；三图同一组件
- [x] T4 `popoverFrame` 统一两个 popover 宽度 — 验证：`rg popoverFrame` 两处引用
- [x] T5 `shared/i18n.ts` en + zh-CN；`client/web.ts` 读 Paseo 语言设置并监听变化 — 验证：`shared/i18n.test.ts`（解析 / 回退 / zh-CN 文案 / 时长单位）
- [x] T6 全部 UI 文案、a11y label、KPI / insights、Command Center、attention pill 走文案表 — 验证：`rg` 扫 `client/**/*.tsx` 无残留英文字面量（仅图标名与产品名 Activity）
- [x] T7 `npm test` / typecheck / reload — 验证：238 tests pass；`paseo plugin reload activity` 后 running，日志无错误
- [x] T8 文档：`docs/design-system.md`（公共组件、tooltip、浮层宽度、文案规则）、specs README 索引、065 §6 状态 — 验证：链接可达
- [ ] T9 页面验收（spec §4）：切换 app 语言、三图 hover、重试、popover 宽度 — 待真机
