# 058 — tasks

- [x] T1 Spec / plan / README 索引（048 标为被修订）
  - 验证：本目录三件套 + `specs/README.md` 有 058 行、048 行标注修订
- [x] T2 `buildActivityCalendar` 起点改为本周周日往前 51 周
  - 验证：`npm run typecheck`
- [x] T3 重写日历布局测试为 weekday 对齐口径
  - 验证：`npm test` 210 pass（含 058 两条新用例）
- [x] T4 CHANGELOG Unreleased
  - 验证：条目说明行 = weekday、列 = 自然周、末列留白
- [ ] T5 页面目测
  - 验证：`paseo plugin reload activity-dev` 后打开 Global Activity，同一行为同一星期几
