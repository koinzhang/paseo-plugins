# 087 — plan

## 最小实现

本阶段目标已由用户改为实际升级 0.17.4；第一阶段保守兼容方案不再约束当前实现。

0. 先将 devDependency `@getpaseo/plugin` 精确锁为 0.17.4，执行授权的 `npm install --ignore-scripts --no-audit --no-fund` 同步锁文件与 peer 包；manifest、README、CHANGELOG 标明 >=0.17.4。随后依据实际新类型报错修正必需字段与 deprecated 引用，不保留 0.15 shim。
1. `PaseoApi` 继续从 `PluginHookContext["paseo"]` 获取；通过 `agents.ref` 返回 handle 的 `timeline.refetch` 返回类型推导 `AgentTimelineItem`，与实际采集数据源保持一致。
2. turn 采集增加必需的 `turnId: string | null`，入口传 `event.turnId`。将仅实时采集使用的 refetch helper 改为完整 turn 读取，删除 500 条实时 tail 常量及可调 limit；严格过滤 `entry.turnId === turnId`，null turnId 返回空集合。单轮的 call / prompt 写入携带已确认的 turnId，复用既有 model、消息去重和终态跳过规则。
3. 保持 signal guard：函数入口和两个 await 之后检查 `signal.aborted`，取消时返回 0。初次元数据写入仍在 await 之前。后台 `resyncAgents` 的 500 条 tail / before 分页及 lastSeq 完全不改。
4. `index.server.ts` 的 turn hook 直接 await 采集，传入 SDK 的 `context.signal`，不再脱离 hook 的 promise；取消错误不记为采集故障。
5. 不另造取消控制器。核验 0.15.0 tag 和 0.17.4 的 `plugin-process.ts:shutdown` 都先 `hooks.close()`，后调用插件 cleanup；`PluginHookHandlers.close` 取消所有 active hooks。真实 promise 保持 hook active，SDK signal 因而足以保证关闭 store 后不写入。

`agent.turn.after` 是 `waits: false` 的通知 hook（`packages/plugin/src/server/lifecycle.ts`），返回真实采集 promise 只让宿主跟踪处理与取消，不阻塞原始 turn 完成。

## 验证

- 先在现有 `server/turn-ingest.test.ts` 增加三条取消测试，在未修改实现时复现失败，再改实现验证通过；补充真实 SQLite 关闭后的迟到响应测试。
- 实际安装后先执行完整 typecheck 记录新 SDK 报错；修正后运行 `npm run typecheck`、`npm test` 串行全量验收。
- turn 回归新增 >500 条、跨轮过滤、null / 缺失 turnId、重复采集与旧轮次保留；继续验证取消与真实 SQLite 关闭保护。
- 核验实际 plugin / client / protocol 版本及 npm ls，检查 package-lock SDK 节点与 package.json 一致。
- 查看 tracked diff 与新 spec 的完整内容，确认范围与未采纳项均已记录。

## 运行时边界与限制

当前 checkout 固定 SDK 0.17.4，最低 Paseo 运行时为 >=0.17.4；不保留 0.15.1 类型兼容。不 bump 插件产品版本，不将旧 0.8.0 发版记录改成新边界，新增 Unreleased 说明。

当前高层 refetch 没有 `signal` 参数，因此取消只阻止读取完成后的后续工作，不主动中止已发出的 RPC。宿主 hook timeout 与 shutdown 负责触发 signal；不通过未声明接口或类型断言实现主动取消。

第一阶段尝试使用 `AbortSignal.any` 合并自身 lifetime 时遇到本地类型缺失；追踪宿主关闭顺序后已移除多余 lifetime。当前直接使用 SDK signal，不需要重新引入控制器。

此前 wholeTurns 受旧高层 SDK 类型限制而延期；用户已授权实际升级，本阶段采用新 SDK 公开接口，不使用 structural cast 绕过类型检查。后台五分钟补扫负责最新 turn 之外的历史完整性与 hook 读取被后续 turn 取代时的补齐。
