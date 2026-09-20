# 054 — Tasks

## T1 互换

- [x] T1.1 `buildActivityKpi` 收 `days` / `locale`，`Peak weekday` 落在倒数第二格（shared/insights.ts）
  - 验收：活跃日峰值星期正确；无活跃日 → `—`；值文案与 010 一致
  - 验证：`shared/insights.test.ts` `buildActivityKpi`（`rows[4]` = `Mon` / `Sun`，空 `days` → `—`）
- [x] T1.2 `buildActivityInsights` 收 `workspaces`，第 3 行输出 `Workspaces`
  - 验收：值 = 入参；行序仍为 8 行且顺序固定
  - 验证：`shared/insights.test.ts` `buildActivityInsights`（行序含 `Workspaces`、`rows[2] === "7"`）
- [x] T1.3 `client/global-surface.tsx` 接线与 `useMemo` 依赖同步
  - 验收：`summary.workspaces` 进 Insights、`activityQuery.data?.days` + `locale` 进 KPI
  - 验证：typecheck；浏览器实测数值与真实 builder 一致

## T2 验证与收尾

- [x] T2.1 `npm run typecheck` + `npm test`（198 通过；干净副本 + lock 的 0.9.0-beta.2 依赖，避免动本机 0.8 的 node_modules）
- [x] T2.2 浏览器实测（harness，`/tmp/rnw-harness`）：KPI 6 格含 `Peak weekday = Sat`，Insights 8 行含 `Workspaces = 83`；全部单行、无截断
- [x] T2.3 文档：本目录；050 §4.1 第 3 格 / §4.2 第 3 行与 plan / tasks 标注 054 修订；architecture Global 行；specs/README 索引；CHANGELOG

## 备注

- 纯参数搬家：两个指标的计算函数、口径与文案都未改，无新 RPC / 新查询。
- 未推送：本变更停在本地 change（`main` 已含 049–053，推送需再执行 `jj bookmark set main -r @ && jj git push`）。
