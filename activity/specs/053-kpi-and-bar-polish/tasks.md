# 053 — Tasks

## T1 KPI 值去占比

- [x] T1.1 `topProviderValue` / `topModelValue` 只输出名称（shared/insights.ts）
  - 验收：全部态与过滤态都不含 `%`；排名口径不变；无样本 `—`
  - 验证：`shared/insights.test.ts`（`leads with top / longest tiles` → `Codex` / `Gpt 5.4`；过滤态用例 → `Gpt 5.4`）
- [x] T1.2 删除随占比一起失效的局部变量（`total` / `pct`）

## T2 堆叠柱圆角

- [x] T2.1 段圆角改为「仅最上方一段取 3px 上圆角」，空槽去圆角（client/agent-creations.tsx）
  - 验收：接缝无缺口；每根柱只有顶部两角是圆角
  - 验证：harness DOM 计算样式 —— 首段 `borderTopLeftRadius/Right = 3px`，其余段与所有底角 `0px`（8 段实测）

## T3 验证与收尾

- [x] T3.1 `npm run typecheck` + `npm test`（200 通过）
- [x] T3.2 harness 渲染真实组件：KPI 由 `buildActivityKpi` 生成 → `Cursor` / `Auto Smart` 18px 单行；`14.2 days · active` 12.4px；无截断
- [x] T3.3 `paseo plugin reload activity-dev` → running
- [x] T3.4 文档：050 §4.1 第 4/5 格与 051 §4.2 标注被 053 修订；specs/README 索引；CHANGELOG

## 备注

- 占比仍由 `usage.by-provider` 提供（`messageCount` / `models[].count`），本次只改 KPI 文案。
- harness 同 052：`/tmp/rnw-harness`（react-native-web + esbuild），KPI 值现在直接来自 `buildActivityKpi`，改口径后无需手改样例。
