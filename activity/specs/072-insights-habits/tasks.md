# 072 — Tasks

- [x] T1 `shared/insights.ts` 8 行重排；Peak weekday 用 `weekday: "long"`；删 `formatRatio` / longest session
  - 验证：`shared/insights.test.ts`「returns the 8 habit / average rows (072)」+ 空数据全 `—`
- [x] T2 `averageEngagedSessionMs`（shared/usage.ts）+ `usage.agent-lifetime.averageEngagedMs`（server/handlers.ts）
  - 验证：`shared/usage.test.ts`「averageEngagedSessionMs (072)」（空闲间隔、`ts` 缺失退回 `ingestedAt`、无事件会话排除）
- [x] T2b `countMultiTurnSessions` + `usage.agent-lifetime.promptedSessions / multiTurnSessions`（替换 Avg sessions / active day）
  - 验证：`shared/usage.test.ts`「countMultiTurnSessions (072)」；insights 测试 `67%` / 无数据 `—`
- [x] T2c KPI 移除 Active days（`buildActivityKpi` 4 格，删 `kpi.activeDays` / `days` 入参）
  - 验证：`shared/insights.test.ts` KPI 4 格断言
- [x] T3 i18n en / zh-CN：新增 activeDays / longestStreak / multiTurnSessions / avgSessionDuration，删除旧键
- [x] T4 `npm run typecheck` + `npm test`（243 通过）；`paseo plugin reload activity`；本机库实跑见 spec 验收
- [ ] T5 真机页面验收
