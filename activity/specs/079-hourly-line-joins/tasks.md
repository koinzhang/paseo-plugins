# Tasks

- [x] Separate the area fill from its per-cell border and render the joined line overlay — 验证：`AreaSeries` 保留 skewY 面积填充，改为旋转矩形描边 + 圆点接头（3c47664）
- [x] Run typecheck and tests; verify the diff is limited to the chart and this spec — 验证：`npm run typecheck`、`npm test`（254 tests）通过
- [x] Reload the local Activity plugin and verify it is running — 验证：`paseo plugin reload activity`，`paseo plugin ls` 显示 running
