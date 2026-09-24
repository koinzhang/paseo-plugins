# 071 — Tasks

- [x] T1 `normalizeProvider` 不再把 `omp` 归一为 `pi`；删除 `brandProviderId`（shared/classify.ts、shared/usage.ts、client/rank-color.ts）
  - 验证：`shared/classify.test.ts`（`omp` → `omp`）；`shared/usage.test.ts`「keeps Oh My Pi (omp) and Pi as separate providers (071)」+ 直方图 `provider: "omp"` 过滤
- [x] T2 `npm run typecheck` + `npm test`（243 通过）；`paseo plugin reload activity`
- [x] T3 本机库实跑 `aggregateByProvider`：`omp Oh My Pi 43 132`、`pi Pi 52 66`
- [ ] T4 真机页面验收（Provider 下拉出现 Oh My Pi）
