# 059 — plan

## 1. Shared contract / aggregation

- `usage.activity-by-hour` input：`hours`（本版固定调用 168）、可选 `provider`
- output：`hours[]`，每项 `{ key, start, skills, mcp, agents, messages, total }`
- `key` 使用小时起点 epoch milliseconds 字符串，避免 DST 回退时本地标签碰撞
- `start` 使用 ISO 时间供客户端本地化
- `aggregateActivityByHour` 先零填连续 epoch 小时，再把 tools / messages / agents 归桶

## 2. Server

- handler 以当前绝对小时为末桶，计算查询起止 ISO，仅读取 168 小时窗口
- 复用 `store.select` / `selectUserMessages` / `selectAgents` 的现有时间索引与 provider 过滤
- 注册新 RPC，并沿用 background sync hint

## 3. Client

- 新建 `HourlyActivityTimeline`，内部 `AreaSeries` 负责一条填充折线
- 步长 `onLayout 宽度 / 24`：一屏 24 小时，内容宽 167 × slot，横向 `ScrollView`
- 鼠标兜底靠常驻水平滚动条；`onScroll` 只写 `pinnedRight` ref（不触发 render），
  它决定 15 秒轮询后是否重新吸附到 Now
- 两处 `useMemo` 冻结元素标识：hover 改状态时不重建约 330 个 skew 段和 168 个热区
- 无 SVG：每段用 `overflow: hidden` 格子裁剪一块 `skewY` 平行四边形，
  顶边 = 折线段，主体 = 面积；`borderTopWidth` 乘 `hypot(1, tan)` 保持线宽恒定
- messages 在轴上方、agents 在轴下方（容器 `scaleY(-1)` 镜像），各自归一
- 168 个透明 `Pressable` 叠在图上负责 hover / focus / 点击，读数行给四类明细
- Global surface 使用独立 query，固定 `hours: 168`，放在 `AgentCreations` 后

## 4. 验证

- shared 聚合测试：零填、边界、provider、low confidence、message fallback、DST-safe key
- handler 测试：只读本地 store，返回固定窗口
- typecheck / 全量 test / plugin reload
