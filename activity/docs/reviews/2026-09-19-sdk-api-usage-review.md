# 官方 SDK API 使用审查 — 2026-09-19

- 审查基线：HEAD `9b358b3`（"feat(activity): refresh panels on turn end; prepare 0.3.0"）
- 范围：`client/` / `server/` 全部 `paseo.*` 调用点 + 订阅 / 状态刷新链路（035–037）
- 运行时基线：CLI / daemon `0.8.0`，插件 devDependency `@getpaseo/plugin@0.8.0`
- 外部依据：
  - 官方文档 `https://paseo.sh/docs/plugins/v0.8/reference.md`、`https://paseo.sh/docs/sdk/events.md`、`https://paseo.sh/docs/sdk/reference.md`
  - daemon 0.8.0 实际实现（本机 Paseo.app 反编译验证）：`app.asar → node_modules/@getpaseo/server/dist/server/server/session/agent-updates/agent-updates-service.js` 与 `session.js`
- 验证状态：已核查并落实 038 修复；原始发现保留在下文，当前处置以各节“复核与处理”为准。

> 存放约定：本报告是时间点质量快照，放 `docs/reviews/`；`specs/` 编号目录只承接功能点。
> 下文原始行号对应审查基线；修复后的定位使用文件名与函数名。修复规格见 [038](../../specs/038-sdk-api-remediation/)。

---

## 消化状态总览

| 编号 | 严重度 | 结论 | 状态 |
|---|---|---|---|
| A | 高 | 本地监听不拥有 observation，原实时性依赖宿主 | 已做 0.8 兼容修复：独立轮询保证完整性，目录实时推送仍为尽力加速 |
| B | 中 | Workspace 状态全 host 拉取且每次推送重拉 | 已修复：agent placement 项目 ID 过滤 + 增量缓存（已修正字段混淆） |
| C | 中 | 从非 running 状态推断回合结束 | 已修复：单 agent 使用 timeline；workspace 明确为启发式刷新 |
| D | 中 | 新句柄 current() 为 null 导致项目 skill 路径缺失 | 已修复并补回归测试 |
| E | 低 | Pill 初始化未翻页 | 已修复并覆盖卸载/推送竞态 |
| F | 低 | CLI 未显式指定 host | 原结论需修正：默认解析支持自定义 socket；保留环境依赖说明 |
| G | — | 已确认正确用法 | 保持 |

### 本次验证

- `npm run typecheck`：通过。
- `npm test`：161 项全部通过；新增项目 SKILL.md 解析、元信息缺失回退、pill 分页/并发 remove/卸载/无推送轮询、workspace 分页过滤及两个 projectKey 不同的等待输入回归测试。
- `paseo plugin reload activity` / `paseo plugin ls`：`running`，加载日志出现 `store ready` / `Plugin ready`。
- 未执行真机多端 UI 交互验收、远端/自定义 daemon 环境矩阵；不将这些项目视为已验证。

### 保留的兼容性边界

0.8.0 的目录流仍只有共享 slot。插件不覆盖宿主订阅，也没有宣称实现独立目录 observation。目录推送缺失时，workspace 状态由 15s 轮询恢复；pill 每轮完整分页结束后 15s 再同步（请求耗时另计），隐藏 pill 也会静默重新查询，只有非空数据才重新显示。权限计数和归档 agent 不保证秒级更新。升级独立 observation 不属于本次依赖版本范围。

---

## A. `agents.subscribe` 不符合官方订阅契约（高）

**复核与处理**：问题成立。`client/pill-directory.ts` 实现完整分页的独立轮询，失败下轮重试，卸载停止；初始化期间的 upsert/remove 在快照上重放，避免晚返回数据复活已删除 pill。Workspace 保留原有 15s 轮询，目录监听只增量更新缓存；单 agent 已改 timeline。035/037 已记录推送依赖与延迟边界。未采用会覆盖宿主 slot 的 `list({ subscribe: {} })`。

**现象**

`client/pill.tsx:180`、`client/workspace/panel.tsx:177`、`client/use-agent-turn-end.ts:25` 均只调用
`paseo.agents.subscribe(handler)`，从未发起 `agents.list({ subscribe: {} })`。

**依据**

- 官方文档（sdk/events.md）：
  - "`client.agents.subscribe()` and agent-handle `subscribe()` add local listeners to observations
    owned by that API instance. **They do not request data.**"
  - "On capable daemons, connecting, plain reads, and local directory listeners **do not start observation**."
  - "Requires an owned `list({ subscribe: {} })` observation."
- daemon 0.8.0 实现验证：
  - `agent-updates-service.js` `forwardLiveAgent()`：`subscription` 为空时**不 emit `agent_update`**，
    只转发 workspace update；
  - 每个 session（连接）只有 **1 个订阅 slot**：`beginSubscription()` 直接覆盖上一个 subscription；
  - `session.js handleFetchAgents()`：只有请求带 `subscribe` 时才 `beginSubscription({ filter: request.filter })`。

**实际后果**

插件能收到推送，是因为宿主 App 自己启动时执行了 `refreshAgentsInternal({ subscribe: {} })`
（App bundle 验证，filter 默认 `includeArchived: false`）。因此：

1. 插件看到的更新范围由 **宿主 App 的 filter** 决定——归档 agent 的 `agent_update` 收不到
   （Workspace 面板状态 map 包含归档 agent）；
2. 若宿主 App 改变订阅策略（换 filter / 改用 0.9 的独立 observation / 不再常驻订阅），
   插件实时性会**静默失效**，且没有测试或日志能发现；
3. 035 的真机验收项（T4）建立在这个寄生链路上，不可靠。

**建议**

- 方案 1（0.8.0 兼容）：插件在 client entry 自己发起一次
  `agents.list({ filter: { includeArchived: true }, subscribe: {} })`，用返回的 entries 建状态 map，
  后续 `agents.subscribe` 增量更新。**注意 0.8.0 单 slot 会顶掉宿主 App 的订阅**，
  需确认宿主是否依赖该 slot（本机 App 依赖），否则不能贸然抢占。
- 方案 2（推荐，等 0.9）：升级 devDependency / requirements 到支持独立 observation 与
  `subscription.release()` 的版本后再自持订阅。
- 方案 3（可立即做）：状态 / attention 用 `useAgent(id, selector)` 直接读宿主规范化状态（官方实时路径），
  权限计数徽标继续低频 `agents.list` 补齐（`PluginAgentSnapshot` 不含 `pendingPermissions`）。
- 无论哪种，先在 035 补一条偏差说明：现状是"寄生宿主订阅"，非自持 observation。

---

## B. Workspace Agents 状态查询全量拉取（中）

**复核与处理（第二次修正）**：全量查询问题成立，但首次修复错误混用了两个 `projectKey`。0.8.0 `session.buildProjectPlacementForWorkspace` 明确构造 `projectKey: project.projectId`，agent filter 匹配的是这个 **placement key**；`projects.list().projects[].projectKey` 则是 `remote:github.com/...` 仓库标识。初次测试仅断言传参，没有模拟 daemon 匹配行为，遗漏了回归。

现在 `client/workspace/panel.tsx` 直接把 `useWorkspace(...projectId)` 传给 `loadWorkspaceAgentStatuses`，每页用于 `filter.projectKeys`，并严格过滤 workspaceId；删除多余的 projects.list 查询与等待。projectId 暂不可用时仍回退全 host 分页。推送维持单条缓存更新。

用户报告的 agent `44cc9fd8-c930-4a1a-9ee5-251b61fbec40` 实测：错误的仓库 key 过滤为 0 条；修复后调用实际 loader 返回该 workspace 的 33 条状态，其中目标 agent `permissionCount=1`、`rank=0`、attention kind 为 permission，与 daemon 直接快照一致。根因是空轮询结果反复覆盖推送缓存，导致等待输入提示消失。新增模拟真实 placement 过滤的回归测试覆盖这一问题。

**现象**

`client/workspace/list-host-agents.ts:33-45`：`filter: { includeArchived: true }` + 每页 200 翻页取
**整个 host 的全部 agent**，再按 `workspaceId` 客户端过滤。触发时机为 15s 轮询 +
每次 `agent_update` 突发（300ms 防抖 invalidate，见 `client/workspace/panel.tsx:168-194`）。

**依据**

- 协议 `FetchAgentsRequestMessageSchema.filter` 支持 `labels / projectKeys / statuses /
  includeArchived / requiresAttention / thinkingOptionId`，**没有 workspaceId**；
- `projectKeys` 按 `project.projectKey` 过滤（daemon `matchesAgentStructuralFilter` 验证），
  面板可用 `useWorkspace(workspaceId, w => w.projectId)` 收窄（需确认 projectKey 与 projectId 的对应关系）。

**建议**

- 短期：用 `projectKeys` 收窄；订阅突发只做增量 map 更新，不再全量重拉；
- 长期：随 A 的方案 1/2，用 observation snapshot + update 维护状态 map。

---

## C. 用 `agent_update` 推断回合结束（中）

**复核与处理**：问题成立。`useAgentTurnEnd` 仅接受 agentId，订阅 handle.timeline 的 `turn_completed` / `turn_failed` / `turn_canceled`；replacement 作为数据失效提示也刷新。保留 300ms 防抖及 2s ingest settle，处理订阅 ready rejection，cleanup 释放监听与定时器。Workspace 改用明确命名的 `useWorkspaceActivityRefresh`，状态只是尽力刷新提示，不再称为回合结束信号；15s 查询轮询保留。

**现象**

`client/use-agent-turn-end.ts:37`：`status !== "running" && status !== "initializing"` 即触发
invalidate（spec 037 称之为"回合结束事件驱动"）。

**依据**

- 官方文档（sdk/events.md）原文："Turn completion comes from `turn_completed`, `turn_failed`, or
  `turn_canceled`. **Do not infer turn completion from an `agent_update` transition to `idle`.**"
- 正确信号：
  - client：`paseo.agents.ref(agentId).timeline.subscribe(...)` 的 turn 事件；
  - server：`server.on("agent.turn_ended")`（本插件 server 已正确使用）。

**实际后果**

- 误报：初始快照、状态跳变等非回合结束的 upsert 也会触发刷新（有 15s 兜底，危害有限）；
- 漏报：真正回合结束若状态未离开 running 则不触发（概率低）；
- 叠加 A 的寄生订阅问题，整条"事件驱动"链路都不可靠。

**建议**

- Agent 面板 / pill 这类单 agent 场景，改用 `timeline.subscribe` 的 turn 事件；
- Workspace 面板若无轻量方案，在 037 spec 里明确这是**启发式刷新触发器**而非回合结束信号，
  并保留轮询兜底。

---

## D. `ref()` 句柄未 `refresh()` 就读取 `current()`（中，真 bug）

**复核与处理**：问题成立，原 009 的“不等待 refresh”优化导致回归。`skillRootsForQuery` 现在 await 空句柄的 refresh，取得 cwd 后解析项目 roots；刷新失败或 agent 缺失时回退 home roots，统计仍可返回。已修正旧反向测试，并用临时项目 `.claude/skills/demo/SKILL.md` 验证实际路径恢复。009 spec/plan 同步修正。

**现象**

`server/handlers.ts:160-164` `skillRootsForQuery()`：

```ts
const handle = paseo.agents.ref(agentId);
const snapshot = handle.current();   // 永远 null
```

**依据**

- SDK 实现（`@getpaseo/client/dist/index.js` `createAgentHandleFactory`）：
  `ref(string)` 初始 `current = null`；`current()` 只返回该句柄已观察到的快照，**从不 fetch**；
  新 `ref()` 不共享其它句柄的观察结果。
- 官方文档："A handle from `ref()` reads `null` for all of them until `refresh()`, `run()`,
  `waitForFinish()`, a timeline refetch, or `subscribe()` delivers a snapshot."

**实际后果**

`usageSkillsByNameRpc`（pill / Agent 面板传 `agentId`）永远走 `buildHomeSkillRoots(homeDir)`，
项目内 skill（`DEFAULT_SKILL_ROOTS` 中 `.` 前缀项，如 `.claude/skills`）解析不出 `skillPath`，
popover / 面板里没有"打开 SKILL.md"入口。

**正确对照**

`server/resolve-model.ts:9-14` 已是正确写法（null 时 `await handle.refresh()`）。
`createSkillsByNameHandler` 本身是 async，补 refresh 即可：

```ts
const handle = paseo.agents.ref(agentId);
const snapshot = handle.current() ?? (await handle.refresh())?.agent;
```

---

## E. Pill 初始化未翻页（低）

**复核与处理**：问题成立。`watchPillDirectory` 使用 `listAllAgentPages`，每页 limit 200，不请求目录 observation；完成快照后持续轮询。测试覆盖第二页 agent、翻页期间 remove、卸载后晚返回、无推送仍发现新 agent。

`client/pill.tsx:195-204`：`client.paseo.agents.list()` 只取第一页（默认 page size 由 daemon 决定），
超出首页的 agent 要等自身 `agent_update` 才出现 pill。仓库已有 `listAllAgentPages`
（`shared/list-agent-pages.ts`，server 已用），client 侧未用。

---

## F. Unarchive 走 CLI shell-out（低）

**复核与处理**：shell-out 及 PATH 依赖成立，但不能据此断言仅默认端口可用。核对 CLI 0.8.0 `dist/utils/client.js`：显式 host / PASEO_HOST 优先；默认解析读取 PASEO_HOME 下 pid/config，以及 PASEO_LISTEN 的 IPC 配置。插件子进程继承 daemon 环境且在 daemon 机器执行，因此 UI 连接远端本身不构成错路由。保留 CLI fallback，补充 handler 注释。SDK 没有 reload API；`handle.refresh()` 是 refetch 读取，不能替代 unarchive。若宿主继承了指向别处的 PASEO_HOST 或 PATH 无 paseo，仍是部署环境限制，本次未声称消除此限制。

`server/handlers.ts:252-265`：`execFileAsync("paseo", ["agent", "reload", id])`。

- 已核查 0.8.0 SDK / protocol：**没有** reload / unarchive API，CLI 是唯一途径（注释中的结论正确）；
- 风险：依赖 daemon 进程 PATH 中的 `paseo`；未传 `--host`，依赖 CLI 默认本地 daemon
  （本地 daemon + 默认端口场景成立；自定义 socket / 远端场景需重新评估）。

---

## G. 已确认正确的用法

| 用法 | 位置 | 说明 |
|---|---|---|
| `terminals.list` / `capture` / `kill` 轮询 | `client/workspace/panel.tsx:154-159`、`terminals-section.tsx:65-76` | 0.8.0 无 terminal 订阅 API，037 NG2 判断正确 |
| `server.on("agent.created" / "agent.archived" / "agent.turn_ended")` | `index.server.ts:74-128` | 生命周期 hook 用法正确，turn_ended 是官方回合结束信号 |
| `useAgent(agentId, selector)` | `client/panel.tsx:53` | 传 selector、不选整个 snapshot，符合文档 |
| `useSettings` + `save(values, revision)` | `client/workspace/panel.tsx:76,110-113` | host-scoped settings，乐观并发用法正确 |
| `agents.ref(id).archive()` | `client/workspace/panel.tsx:739` | 官方归档 API |
| `timeline.refetch({ projection: "canonical", direction, cursor, limit })` | `server/handlers.ts:557-587` | 游标翻页与 epoch 处理正确 |
| `useRpc` / `defineRpc` / zod 契约 | `shared/usage.ts`、`index.server.ts` | 双端校验、无客户端直连 daemon 私有 API |

---

## 同类问题复查与修复

| 问题 | 根因 | 修复与验证 |
|---|---|---|
| 旧轮询覆盖新 permission/remove 推送 | queryFn 晚返回覆盖 setQueryData | 有缓存时先取消旧查询，再从取消前捕获的最新缓存应用推送；首屏 loader 缓存并重放分页期间事件。真实 QueryClient 测试验证 permission=1 不退回 0，删除项不复活，查询保持 success/idle；异常时释放监听。 |
| 同步时间混作 agent 更新时间 | agentRowFromSnapshot 使用 now，UI 优先本地库 | 保存 daemon updatedAt，缺失时使用 createdAt；工具历史推导记录保存最后活动时间；UI 优先 live updatedAt，避免旧库同步时间盖过实时值。测试覆盖原时间、缺失回退、乱序历史。现存 active 记录在后续后台同步时纠正；未做全库迁移。 |
| 不变 idle 快照反复唤醒空 pill | 每轮目录轮询无条件调用显示逻辑 | 目录按 agent 版本去重；新 idle 活动仍触发。隐藏 pill 保留静默用量补查，非空才显示，覆盖延迟 ingest；并发合并，删除/卸载后晚返回不显示。测试覆盖不变快照、重新添加、延迟非空与卸载。 |

以上为本轮已实现修复；类型检查及 161 项测试通过。未补做真机 UI 目视验收。

## 后续验收

1. 真机观察 Agent / pill 的成功、失败、取消回合刷新，以及 workspace permission/attention 更新。
2. 目录推送不可用时验证 15s 轮询回退；不再以秒级目录更新作为 0.8.0 的硬保证。
3. SDK 升级到独立 observation 后，再替换兼容轮询并重新核查 cleanup 契约。

## 附：验证方法

```bash
# 调用点枚举
rg -n "paseo\." activity/client activity/server --glob '!*.test.ts'

# daemon 行为验证（0.8.0，本机 Paseo.app）
#   app.asar → node_modules/@getpaseo/server/dist/server/server/session/agent-updates/agent-updates-service.js
#     forwardLiveAgent() / beginSubscription()：无 subscription 不发 agent_update；单 slot
#   app.asar → node_modules/@getpaseo/server/dist/server/server/session.js
#     handleFetchAgents()：subscribe 存在才 beginSubscription
#   app bundle：宿主 App refreshAgentsInternal({ subscribe: {} })（includeArchived 默认 false）
```
