# 004 tasks

- [x] T1 `ActivityDay` + `aggregateActivityByDay` 计入 distinct agents；单测覆盖同日多 agent / 同 agent 多调用
  - 验证：`npm test` aggregateActivityByDay 2 cases pass
- [x] T2 `buildActivityCalendar` 透传 `agents`（daily / weekly sum / cumulative sum）
  - 验证：activity.test.ts cumulative/weekly agents asserts
- [x] T3 热力图 tooltip + accessibilityLabel 展示 agents
  - 验证：`client/activity-heatmap.tsx` 文案含 agents
- [x] T4 `npm run typecheck`、`npm test`（68/68）；`paseo plugin reload tool-usage` → running
