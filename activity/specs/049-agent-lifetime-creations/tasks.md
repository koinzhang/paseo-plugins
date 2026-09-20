# 049 — Tasks

## T1 归档补扫

- [x] T1.1 `background-sync.listAllAgents` 带 `filter: { includeArchived: true }`
  - 验收：宿主归档 agent 进入注册表；`archived_at` 补齐
  - 验证：reload 后注册表 179 → 453 行，`archived_at` 非空 164 → 441
- [x] T1.2 `check()` 扫描循环跳过 `archivedAt` 非空 entry
  - 验收：归档 entry 不写 checkpoint、不发 timeline 请求
  - 验证：`background-sync.test.ts` "archived agents are registered but never scanned"
- [x] T1.3 每次目录同步输出覆盖日志（listed / archived / registry）
  - 验证：`paseo plugin logs activity-dev` → `directory sync listed=403 (archived=398) registry=453`

## T2 最长寿命 RPC

- [x] T2.1 `pickLongestAgentLifetime` + `AgentLifetimeItemSchema` + `usageAgentLifetimeRpc`（shared）
  - 验收：取最大 `durationMs`，同值取更早 `createdAt`；缺时间戳 / 负跨度 / provider 不匹配不计入；`sampleSize` 正确
  - 验证：`shared/usage.test.ts` `pickLongestAgentLifetime (049 / 051)`
- [x] T2.2 `createAgentLifetimeHandler` + `index.server.ts` 注册
  - 验收：与 SQL `MAX(julianday(archived_at)-julianday(created_at))` 一致
  - 验证：`server/handlers-query.test.ts`；实机 `3713f5b2…` 14.2 天，两侧一致

## T3 直方图

- [x] T3.1 `buildAgentCreationHistogram`（shared/activity.ts）
  - 验收：日 / 周 / 月分桶边界（31 / 400 天）正确；空档补 0；`from` 截断起点；桶和 = 区间创建数
  - 验证：`shared/activity.test.ts` `agent creation histogram (049)`；051 起由 `buildAgentCreationBuckets` 取代（测试见 051 T1.3）
- [x] T3.2 `formatDuration`（shared/format.ts）
  - 验收：min / h / days / months 分档；非法值回退
  - 验证：`shared/format.test.ts`；顺带删除 039 遗留的 `formatUpdatedAt` 别名及其断言
- [x] T3.3 `client/agent-creations.tsx` 组件 + Global 面接线
  - 验收：直方图随 range / provider chips 变化；页脚显示最长寿命（all time）与测量基数
  - 验证：typecheck + 数据链路实测（Electron 面无法在本机截图，见备注）

## T4 收尾

- [x] T4.1 `npm run typecheck` + `npm test`（185 通过）
- [x] T4.2 `paseo plugin reload activity-dev`，库内归档补齐（179 → 453 / 164 → 441）
- [x] T4.3 specs/README.md 增补 049 行；architecture.md 同步口径、RPC 表与边界

## 备注

- Global 面渲染未做像素级验证：Paseo 是 Electron 应用，本机无 CDP 端口，也没有 react-native-web / react-dom 可离线渲染。已验证的是 typecheck、纯函数单测、以及组件所依赖的数据链路（`usage.activity-by-day` 与 `usage.agent-lifetime` 的实机数值）。
- 残留缺口 45 条（已删 project 下的 agent）无法通过 `agents.list` 获取，见 spec 4.4；未做绕行实现。
