# 060 — tasks

- [x] T1 Spec / plan / README 索引
  - 验证：本目录 `spec.md` / `plan.md` / `tasks.md` + `specs/README.md` 060 行
- [x] T2 热力图尾部留白
  - 验证：月份行去掉 `height: 24`、内层滚动内容去掉 `paddingBottom: 4`（`client/activity-heatmap.tsx`）
- [x] T3 Timeline 内部 gap 对齐
  - 验证：根 gap `compact ? 8 : 10` → `compact ? 10 : 12`（`client/hourly-activity-timeline.tsx`）
- [x] T4 insights / 排行标题间距 token
  - 验证：`titleRow.marginBottom` 与 insights 内联 margin 改 `compact ? 8 : 10`；`block.gap: 2` 与 `paddingVertical: 9` 未动（列表密度不变）
- [x] T5 CHANGELOG
  - 验证：Unreleased → Fixed 条目
- [x] T6 验证与重载
  - 验证：`npm run typecheck` 通过；`npm test` 212 pass；`paseo plugin reload activity-dev` 后 running
- [ ] T7 页面目测
  - 验证：KPI → 热力图 → 直方图 → Timeline → insights / 排行，相邻两节字形间距一致；五个标题到内容间距一致
