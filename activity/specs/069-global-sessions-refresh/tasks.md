# 069 — Tasks

## T1 筛选

- [x] T1.1 移除 range chips；by-provider 单查询，heatmap 不带 `from`（client/global-surface.tsx）
  - 验证：typecheck；harness 页面无时间 chips
- [x] T1.2 `selectProviderOptions` 默认不截断，删 `PROVIDER_FILTER_LIMIT`（client/provider-filter.ts）
  - 验证：`client/provider-filter.test.ts`「lists every provider by default」+ 显式 limit 用例
- [x] T1.3 `ProviderDropdown`：`Provider: All ▾`，全部选项、选中勾、backdrop 关闭（client/provider-dropdown.tsx）
  - 验证：harness（react-native-web）展开列出 8 项（All + 7 provider），选 Codex 后触发器显示 `Provider: Codex`、KPI 切到 Codex
- [x] T1.4 Most used models 不截断，skills / MCP 仍 8 行

## T2 KPI / Insights / 文案

- [x] T2.1 `buildActivityKpi`：Sessions / Messages / Top provider · % / Top model · % / Active days / Longest streak
  - 验证：`shared/insights.test.ts`（`Codex · 75%`、`Gpt 5.4 · 56%`、选中 claude → `Claude · 25%` / `Opus · 100%`、空数据 `—`）
- [x] T2.2 `buildActivityInsights`：去 Active days / Messages，加 Peak weekday / Longest session，仍 8 行
  - 验证：`shared/insights.test.ts` 行序与值
- [x] T2.3 i18n en + zh-CN：`sessions` 系列键；删 `global.ranges` / `global.heatmapModes`；热力图 / 直方图 / Timeline 改用 sessions 文案
- [x] T2.4 KPI FitText：值最小字号 `FONT_SIZE.caption`，可用宽度扣除分隔线 1px（client/usage-stats.tsx）
  - 验证：harness 780 宽下 `Cursor · 62%` / `Auto Smart · 60%` 的 scrollWidth = clientWidth（不再省略号）

## T3 热力图 / Providers 排行

- [x] T3.1 `ActivityHeatmap` 的 `modeOptions` / `onModeChange` 可选；Global 固定 daily
- [x] T3.2 `ProviderRanking`：色块 + 名称 + 比例条 + 数值，`‹ Sessions ›` 循环 4 指标，选中 provider 时其余行 0.4 不透明
  - 验证：harness 截图与参考图一致；Next metric → Messages，数值随之变化

## T4 收尾

- [x] T4.1 `npm run typecheck` + `npm test`（239 通过）
- [x] T4.2 `paseo plugin reload activity`（running）
- [ ] T4.3 真机页面验收（Paseo app Global Activity）
- [x] T4.4 文档：本目录、specs/README 索引、016 标注、architecture Global 行、CHANGELOG Unreleased
