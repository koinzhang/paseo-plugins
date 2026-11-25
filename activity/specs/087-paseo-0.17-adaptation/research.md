# 087 — research

## 实际版本锚点（2026-11-25）

- 主 checkout：`5326249867269f7cda3a70315d584a3da886a218`。
- 只读 Paseo checkout：`/Users/koinzhang/Workspace/xws/paseo`。
- 上游 commit：`1ff119dc2a42825e7fdc46c504b6ccee52a4f8be`。
- `paseo --version`：`0.17.4`（退出码 0；伴随 Electron codesign 警告，不影响版本输出）。
- 上游 `packages/plugin/package.json`：`0.17.4`。
- 第一阶段及本阶段开始前 Activity 依赖：`0.15.1`；manifest：`>=0.15.0`。
- 用户新目标已取代保守方案：本阶段实际安装并锁定 plugin / client / protocol 0.17.4，manifest 改为 >=0.17.4；安装和实测结果在 tasks 中记录，不复用旧 SDK 通过结论。
- 不刷新 / 修改上游、不修改其他插件。并行 Agent 的 commands 等改动保留；允许 Activity 本地依赖安装，不允许 reload / 发布。

## 已核验与可复用改进

以下上游路径均相对 Paseo checkout；本地 `dist` 路径相对 Activity。

| 接口 / 结论 | 对现有实现的收益与处置 | 源码证据 |
|---|---|---|
| `agent.turn.after.timeline` 已从 SDK 删除 | 修复类型依赖；改从实际 refetch 返回项推导，避免下一次升级被旧类型阻塞 | `packages/plugin/src/server/lifecycle.ts:PluginHookEvents`；`public-docs/plugins/migration.md` Turn history in v0.16；删除提交 `af6ca46ae3e7d209b2aca0c23bf9ba1fc1a8eb28` |
| `PluginHookContext.signal` 和 hook promise | 落地：等待真实采集 promise，直接复用 SDK signal 阻止 shutdown / timeout 后写库；无需额外 lifetime | `packages/plugin/src/server/lifecycle.ts:PluginHookContext`；`packages/server/src/server/plugins/lifecycle/index.ts:PluginHookHandlers.invoke/cancel/close`；`packages/server/src/server/plugins/plugin-process.ts:shutdown`（0.15.0 tag 和 0.17.4 均先 hooks.close 再 cleanup）；`packages/server/src/server/plugins/runtime.ts:emit/request`；`public-docs/plugins/hooks.md` Context and cleanup |
| `{ limit: 1, wholeTurns: true }` + `entry.turnId === event.turnId` | 本阶段落地：不按 500 条截断大 turn，少读前面已入库的 turn，并避免后续 turn 混入；null / 缺失 turnId 不关联。实时 helper 与后台分页无共享调用，不改变后台 lastSeq 语义 | `packages/client/src/index.ts:PaseoAgentTimelineRefetchOptions`；`public-docs/plugins/hooks.md` agent.turn.after；`packages/server/src/server/agent/timeline-projection.ts:selectTail/wholeTurnWindowStart`；`plugin-examples/lifecycle-actions/index.server.ts`；Activity `server/turn-ingest.ts` 与 `server/handlers.ts:resyncAgents` |
| 旧 SDK 有限支持 wholeTurns（历史结论） | 第一阶段的 0.15.1 高层 refetch 无该参数，因此延期；当前直接安装新版本公开接口，不保留 shim | 第一阶段实际 dist 对照；上游 `packages/client/src/index.ts` 的新公开类型 |
| Entity refs 与 collection query / state | `useAgents` / `useWorkspaces` 支持 host-qualified refs、where/orderBy/groupBy 与稳定投影；本次不替代目录 | `packages/plugin/src/client/client-state.tsx`、`query.ts`、`reference-api.ts`、`packages/plugin/src/refs.ts`；app `packages/app/src/plugins/client-state/source.ts` 只投影活跃 agent；Activity 047 的 includeArchived 完整分页与独立 observation 不能机械替换 |
| `defineTranslations` / `useTranslation` / `client.i18n` | 可减少 Web settings polling 并覆盖 native locale；已有 086 明确延期，完整迁移涉及注册标题与整个文案生命周期，本次不拆成局部替换 | `packages/plugin/src/client/translations.tsx`；实际旧 SDK `dist/client/translations.d.ts`；Activity `client/use-app-language.ts`、`client/web.ts`、086 research |
| `useTabState` | 可以持久化 panel 局部状态，但不是本次兼容问题；已有 workspace 显示偏好来自 host settings，不改变其语义 | `packages/plugin/src/client/tab.ts`；Activity `shared/explorer-agent-display.ts` |
| `defineSubscription` / `useSubscription` / server.handle streaming | 可以做 usage 更新推送，但需要新的 public RPC contract、订阅事件与 store notification；本次不增加系统复杂度，保留本地查询缓存和 15 秒轮询 | `packages/plugin/src/rpc.ts`、`client/rpc-context.tsx`、`server/contracts.ts`；Activity `server/rpc-cache.ts`、`client/usage-query.tsx` |
| Deprecated registrations / UI imports | 086 的 screens、sidebar header、addAgentPanel、params、addHook、client/ui 已落地；未发现需要重复机械迁移的调用 | `packages/plugin/src/client/contracts.ts` 与 `server/lifecycle.ts`；Activity 两个入口与 client 源码 |

## 本阶段实际安装与新类型复核

- Sandbox 执行授权的 `npm install --ignore-scripts --no-audit --no-fund` 因 registry DNS `ENOTFOUND` 失败（exit 1）；只升级该命令的网络权限后 exit 0，changed 5 packages。
- `npm ls @getpaseo/plugin @getpaseo/client @getpaseo/protocol` exit 0，三者均 0.17.4，无 invalid；实际三个 package.json 与 package-lock SDK 节点均读回为 0.17.4。
- 第一次实际 0.17.4 typecheck exit 2：`PluginHookAgent` 新增必需 `background`、`metadata`，影响 snapshot adapter 与四处测试 fixture。补齐新 hook 类型字段，保留真实值。
- 进一步 typecheck 显示 0.17.4 的目录 / refresh snapshot 中 `background` 和 `metadata` 仍是 optional（`packages/protocol/src/messages.ts:AgentSnapshotPayloadSchema`）；adapter 按当前协议把未提供字段规范为 false / 空记录。此为新 SDK 两种公开数据形态的边界适配，不是旧版本判断、fallback API 或类型断言。
- RPC transform 复核：`git diff v0.15.1..1ff119dc2a42825e7fdc46c504b6ccee52a4f8be -- packages/plugin/src/rpc.ts` 确认新 `callPluginRpc` 不再先 parse input 再发送，而是直接发送 schema 输入，避免客户端 / 服务端重复 transform；仍使用 `output.parseAsync` 解析返回值。实际 0.17.4 dist 与此一致。`RpcInput` 为 input schema 输出、`RpcOutput` 为 output schema 输入；Activity 的 usage schemas 未使用 transform，也没有手写二次转换 workaround，直接升级 SDK 即获得修复，现有 typed RPC 无需替换。
- 新 collection/entity hooks 不替代 047 的独立含归档目录；当前 0.17.4 的正式 d.ts 仍支持 `useAgent(string, selector)`，现有两处仅取标题、未使用 deprecated props，不引入手造 ref 或额外订阅来机械替换。
- `defineSubscription` / streaming 不能直接替换本地 SQL 查询与 background checkpoint；采用它需要新增 usage push 契约，当前没有可删除的同功能 workaround，暂不新增。
- 审查实际 SDK exports、client/server/shared/入口源代码后，deprecated API / SettingsGroup / useRevealedText / 旧 tail helper 均无残留；后续完整 typecheck 与 test 结果在 tasks 记录。

## 本阶段边界与验证要求

- 完成标准为实际安装 SDK 0.17.4 的 typecheck / 全量 test / npm ls，而非源码推断；结果记录在 tasks。
- 实时采用整轮读取并确认 turnId，后台 500 条分页不变；最新 turn 已被后续 turn 取代时本轮过滤为空，既有后台补扫继续负责最终完整性。
- 已发 RPC 不支持高层 signal 参数，无法主动终止；取消后 guard 防止继续读取或写入。
- 第一阶段 typecheck 曾因 `AbortSignal.any` 的本地类型缺失失败（exit 2，TS2339）；已移除多余 lifetime。第二阶段实际 SDK 0.17.4 完整 typecheck exit 0，npm test 269 pass / 0 fail，详见 tasks。
- 不改变背景 Agent 统计范围：新 hook 有 `background`、snapshot 有 background work count，但统计口径变更需要独立产品决定。
- 本阶段执行完整测试；新版本真实 UI、reload 与 turn.after 日志验证由主 Agent统一执行，不能沿用第一阶段实机结论。
