# 051 — Tasks

## T1 数据层

- [x] T1.1 `AgentCreationDaySchema` / `usageAgentCreationsRpc` / `aggregateAgentCreations`（shared/usage.ts）
  - 验收：本地日分桶；provider 归一 + 降序（同值按 id）；`from` / `to` / `provider` 过滤；时间戳非法行跳过
  - 验证：`shared/usage.test.ts` `aggregateAgentCreations (051)`
- [x] T1.2 `pickLongestAgentLifetime` 纳入活跃行（`archivedAt: null` → `createdAt → now`）
  - 验收：活跃行参与比较且 `archivedAt` 输出 null；`sampleSize` 含活跃行；时间倒挂仍跳过
  - 验证：`shared/usage.test.ts` `pickLongestAgentLifetime (049 / 051)`
- [x] T1.3 `buildAgentCreationBuckets` + `rankCreationProviders`（shared/activity.ts），删除日/周/月粒度分支
  - 验收：零填充 `[from, today]`；越界日丢弃；`count>0` 切片保留；排名稳定
  - 验证：`shared/activity.test.ts` `agent creation buckets (051)`

## T2 服务端

- [x] T2.1 `createAgentCreationsHandler` + `index.server.ts` 注册
  - 验收：走注册表单表；与 SQL 分组统计一致
  - 验证：`server/handlers-query.test.ts` `usage.agent-creations buckets registry rows by day and provider`

## T3 客户端

- [x] T3.1 `mcpServerColor` → `entityColor`（rank-color.ts + Global rank 列表 + 测试）
  - 验证：`client/rank-color.test.ts`（4 例）
- [x] T3.2 `AgentCreations` 重写：provider 堆叠柱 + 浮层卡片 + 轴标签
  - 验收：同一 provider 跨日同色；当日 0 创建显示底槽；浮层列出当日有创建的 provider 与日期（056 起省略 0）；悬浮 / 聚焦 / 点击切换；每柱有无障碍标签
  - 验证：typecheck + 实机数据链路（见 T4.2）
- [x] T3.3 Global 面接线：`histogramQuery` 改用 `usage.agent-creations`；KPI 传 `{ durationMs, active }`
  - 验收：queryKey 仍不含 range chips；`archivedAt == null` → `active`
  - 验证：typecheck；`shared/insights.test.ts` 活跃标记用例

## T4 收尾

- [x] T4.1 `npm run typecheck` + `npm test`（192 通过）
- [x] T4.2 实机数据链路（复制 live DB → 真实 handler 链）：30 桶 / 合计 421；2026-09-20 = 43（Cursor 21 / OpenCode 16 / Codex 3 / Pi 3）；排名 Cursor 249 > OpenCode 103 > Codex 35 > Pi 27 > Claude 7；`provider=codex` 收窄正确；最长寿命 14.2 天、`sampleSize` 453
- [x] T4.3 `paseo plugin reload activity-dev` 后 running
- [x] T4.4 文档：本目录 spec/plan/tasks；049 §4.2/§4.3/§5 与 050 §4.1/§4.3/§5 标注被 051 修订；specs/README 索引；architecture RPC 表与 Global 面描述；CHANGELOG
- [ ] T4.5 页面像素验收（用户在 Paseo 应用内确认堆叠与浮层）

## 备注

- 像素级验证受环境限制（Electron 无 CDP 端口、无 react-native-web / react-dom 离线渲染），沿用 049 / 050 的替代验证：typecheck、纯函数单测、真实 handler 链数值。
- 049 §4.4 的宿主契约缺口（已删 project 下的 45 条 agent）依旧不可见，未做绕行。
