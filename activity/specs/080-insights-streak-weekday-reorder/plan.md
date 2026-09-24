# Plan

只调整行顺序，不改任何取值逻辑：

- `shared/insights.ts` `buildActivityInsights`：返回数组第 3 / 4 位放 `longestStreak` / `peakWeekday`，`workspaces` 顺延到第 5 位；同步更新函数上方顺序注释（072 → 072 / 080）。
- `shared/insights.test.ts`：更新 8 行 label / value 顺序断言与空数据 value 顺序断言。
