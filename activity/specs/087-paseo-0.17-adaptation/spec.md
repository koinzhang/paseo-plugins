# 087 — 实际对齐 Paseo / SDK 0.17.4

## 背景

086 已迁移主要 deprecated API。Paseo 0.17.4 的 `agent.turn.after` 类型已删除恒为空的 `timeline`，但 Activity 的 `server/host-types.ts` 仍从该字段推导 `AgentTimelineItem`。运行时采集虽已使用 `timeline.refetch`，下一次升级 SDK 时仍会在此处类型检查失败。

实时采集 hook 还启动不被等待的 async IIFE：宿主把 hook 当作已完成，无法在读取期间通过 `context.signal` 取消它；插件 cleanup 关闭 store 后，延迟返回的模型或 timeline 请求仍可能触发写入。

以上是初始基线问题；第一阶段已经修复类型来源与取消保护。用户随后明确要求彻底对齐 0.17.4，取代此前「保留 0.15.1、完整 turn 读取延期」的保守方案。当前阶段必须实际安装并锁定 SDK 0.17.4，不保留旧类型兼容 shim。

## 目标

- 从实际读取接口 `timeline.refetch` 的返回项推导 timeline 类型，不依赖已删除的 hook 字段，不引入新的包依赖。
- `@getpaseo/plugin` 固定 0.17.4，package-lock 与实际 plugin / client / protocol 均对齐 0.17.4，最低运行时提高为 Paseo >=0.17.4。
- turn.after 使用 `{ direction: "tail", limit: 1, wholeTurns: true }` 读取完整最新 turn，严格按 `event.turnId` 过滤，只关联确认属于本轮的条目；null / 缺失 turnId 不关联任何轮次。
- hook 返回真实采集 promise，复用公开的 `context.signal`；宿主先取消 active hooks，再调用插件 cleanup 关闭 store。
- 已取消时不开始采集；模型或 timeline 读取后再次检查取消，阻止后续读取和写入。
- 保留 `usage.*`、Global / Workspace / Agent 架构、本地库查询、终态 call 分类、model / prompt 幂等口径；后台补扫继续独立使用 500 条分页与 lastSynced 检查点。
- 对实际新 SDK exports / 类型进行检查，迁移仍有明确替代的 deprecated 用法；有收益才调整其他接口，不机械重写 UI 或目录。

## 非目标

- 不 reload、提交、push、发版或修改其他插件 / 根配置。
- 不安装无关依赖，不引入旧版本 fallback 或类型断言来模拟新 SDK。
- 不改目录统计范围、不迁移 UI state / i18n、不增加订阅 RPC。

## 验收

- 源码不再通过 `PluginHookEvents["agent.turn.after"]["timeline"]` 推导类型。
- 完整 turn 超过 500 条也不截断；旧 / 新轮次混入时只入本轮；空 turnId 不误关联；已采集旧轮次、终态 call 幂等、注册时间保留均不变。
- 开始前、模型读取期间、timeline 读取期间取消的回归测试通过；真实 SQLite 关闭后返回的读取不触发写入或关闭数据库异常。
- `npm ls @getpaseo/plugin @getpaseo/client @getpaseo/protocol` 无 invalid，三个实际安装版本均为 0.17.4。
- 在实际 SDK 0.17.4 下 `npm run typecheck`、`npm test`、`git diff --check` 通过；全部变更仅在 `activity/`。
- 新版本真实 reload、GUI 与真实 turn 日志留给主 Agent 验证，第一阶段实机结果不能替代本阶段验收。
