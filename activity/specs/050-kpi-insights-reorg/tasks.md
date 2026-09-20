# 050 — Tasks

## T1 KPI / Insights 重排

- [x] T1.1 `buildActivityKpi`（6 格）+ `buildActivityInsights`（8 行）改写
  - 验收：顺序与文案固定；Top provider 过滤态显示名称；Top model 保持 provider 内排名
  - 验证：`shared/insights.test.ts`（insights 3 例 + kpi 2 例）；054 起 KPI 第 3 格 = Peak weekday、Insights 第 3 行 = Workspaces
- [x] T1.2 `formatCount` 上移到 `shared/format.ts`
  - 验证：`shared/format.test.ts` `formatCount`
- [x] T1.3 `global-surface.tsx` 接线（删除本地 `formatCount` 与旧 KPI 数组）
  - 验证：typecheck；KPI/Insights 数据来源均为 RPC 数据

## T2 直方图固定窗口

- [x] T2.1 `fixedWindowFrom(days, now?)`（client/range.ts）
  - 验收：本地 00:00 对齐；30 天 → 今天往前 29 天；跨月 / 跨年 / DST 不漂移
  - 验证：`client/range.test.ts`
- [x] T2.2 `AgentCreations` 改 `windowDays` 入参、移除 `lifetime` 页脚
  - 验收：恒 30 柱；标题 `N agents · last 30 days`
  - 验证：typecheck + 组件 props 不再接收 lifetime；051 起 `days` 为 `AgentCreationDay[]` 并按 provider 堆叠
- [x] T2.3 独立 `histogramQuery`（固定 `from`，provider 过滤，15s 轮询）
  - 验收：切 range chips 时直方图数据不变
  - 验证：queryKey `["activity","agent-creations","last30",providerFilter]`（051 起）不含 range

## T3 收尾

- [x] T3.1 `npm run typecheck` + `npm test`（188 通过）
- [x] T3.2 049 spec 标注被 050 修订（直方图窗口 / 页脚）；README 索引补 050；architecture 同步
- [x] T3.3 `paseo plugin reload activity-dev` 并确认插件加载无错

## 备注

- Global 面像素级验证仍受环境限制（Electron 无 CDP、离线无 react-dom/react-native-web），验证覆盖 typecheck、纯函数单测与实机数据链路。
