# 070 — Tasks

## T1 KPI / 文案

- [x] T1.1 KPI 删 Longest streak（shared/insights.ts、client/global-surface.tsx）
  - 验证：`shared/insights.test.ts` 标签 `Sessions / Prompts / Top provider / Top model / Active days`，`rows.length === 5`
- [x] T1.2 Messages → Prompts（en / zh-CN，全部视图）；Show → Latest prompt
  - 验证：`client/workspace/filters.test.ts`（`5 prompts · ship it`）；`rg` 客户端已无 `units.messages` / `common.messages` / `kpi.messages`

## T2 指标切换

- [x] T2.1 `ActivityMetric` 工具与 `buildDailyMetricBuckets`（shared/activity.ts）
  - 验证：`shared/activity.test.ts`「activity metrics (070)」
- [x] T2.2 `MetricStepper`（client/ui.tsx）+ `RankingBars`（client/ranking-bars.tsx）
- [x] T2.3 热力图 / 30 天直方图 / Timeline 接入，默认 Sessions
  - 验证：harness（react-native-web）四个 stepper 初始均为 Sessions；各自切到 Prompts 后热力图色阶、直方图柱高、Timeline 曲线、Projects 排序随之变化，其余图不受影响

## T3 Projects

- [x] T3.1 `agents.cwd` / `agents.project_root` 列与 upsert（server/store.ts、server/agents.ts）
  - 验证：reload 后 `PRAGMA table_info(agents)` 含两列；一次目录同步后 647 行中 582 有 cwd、227 有 project_root
- [x] T3.2 目录同步记录活跃 workspace 的 project root（server/background-sync.ts）
- [x] T3.3 `resolveAgentProjects` / `aggregateByProject` / `usage.by-project`（shared/usage.ts、server/handlers.ts、index.server.ts）
  - 验证：`shared/usage.test.ts`「projects (070)」；本机库 + `paseo project ls` 实跑：tenpaygo-workspace 253、koin-workspace 184、paseo-plugins 115、agents-config-hub 27、knot-workspace 3，Other 65（= 无 cwd 的会话数）
- [x] T3.4 Global 接线：Providers 下方 Projects 排行，随 provider 过滤

## T4 收尾

- [x] T4.1 `npm run typecheck` + `npm test`（243 通过）
- [x] T4.2 `paseo plugin reload activity`（running，日志无报错）
- [ ] T4.3 真机页面验收（Paseo app Global Activity）
- [x] T4.4 文档：本目录、specs/README、architecture、CHANGELOG
