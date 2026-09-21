# 059 — tasks

- [x] T1 Spec / plan
  - 验证：`spec.md` / `plan.md` / `tasks.md`
- [x] T2 小时桶聚合、RPC 与服务端 handler
  - 验证：`aggregateActivityByHour (059)` + `handlers-query` 定向测试通过
- [x] T3 168 小时横向 UI，接入 Global surface
  - 验证：一屏 24 小时、现在在最右；hover / focus / 点击拆四类
- [x] T6 改为发散折线面积图（messages 在轴上、agents 在轴下）
  - 验证：`skewY` 梯形段无 SVG 渲染；线宽随斜率补偿；`npm run typecheck` 通过
- [x] T7 鼠标可用的滚动：24 小时视窗 + 常驻水平滚动条（无翻页按钮）
  - 验证：`onScroll` 只写 ref；贴右状态下轮询不抢回滚动位置
- [x] T4 README 索引与 CHANGELOG
  - 验证：059 索引、architecture RPC 表和 Unreleased 条目
- [x] T5 完整验证与重载
  - 验证：`npm test` 212 pass；`npm run typecheck`；`activity-dev` running
