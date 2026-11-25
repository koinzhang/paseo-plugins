# 018 Tasks

- [x] 核对 scoped 现状与上游证据，先写 spec / plan / research。验证：inbox status 与 package / SDK 源码；继承 017。
- [x] 安装并核对 SDK / client / protocol 0.17.4 与最低 runtime；同步 lockfile / README / CHANGELOG。验证：授权安装 exit 0，npm ls 无 invalid，三个包实际版本 0.17.4；lock 只更新 Paseo 四个包（含 client 必需 relay）。
- [x] 实现 server store 写入失效、背压 / abort / cleanup 与相关 mutation / hook。验证：SQL 写入回调、单 pending 位广播、abort 清理及恢复 finally 通知；订阅不另开数据库。
- [x] 实现一份安装级订阅、初始 / 重连刷新、失败重试与 panel API 迁移。验证：安装级 owner、完整 Inbox query namespace 失效、host-scoped WorkspaceRef；保留 agent 状态轮询。
- [x] 添加必要测试，实际 0.17.4 下 typecheck 与完整 npm test。验证：最终 typecheck exit 0，67 passed / 0 failed / 0 skipped；测试覆盖见下表。
- [x] 查看全部 scoped diff / untracked，记录结果与真实运行时验收边界。验证：tracked diff、逐文件 no-index diff、完整文件清单与 lock；git diff --check exit 0。保留 017 与其他 agent 的改动，未修改其他插件或根配置。

## 首次验证与修正

- 初次 sandbox 安装 exit 1：`ENOTFOUND registry.npmjs.org`，且无法写默认 npm logs；依授权通过 require_escalated 重试同一命令，exit 0，`changed 4 packages in 4s`。
- 首次 0.17.4 `npm run typecheck` exit 2：新增测试使用 Promise.withResolvers，而现有 tsconfig lib 为 ES2023。仅将测试改为普通 Promise 控制器，不改变生产 target / lib。
- 首次最小测试 exit 1：34 项中 33 passed，handler fixture 未提供既有 items.tag 必填 nullable projectKey，被 Zod 拒绝。修正 fixture 为 projectKey: null，不放宽产品契约。

## 最终验证

以下命令在 `inbox/` 串行运行，diff 命令在仓库根目录。Node `v24.14.0`，npm `11.21.3`。

| 命令 | 退出码 | 实际结果 |
|---|---|---|
| `npm install --ignore-scripts --no-audit --no-fund`（require_escalated 重试） | 0 | changed 4 packages；plugin / client / protocol / relay 对齐 0.17.4，其他依赖 lock 未变。 |
| `npm run typecheck`（最终） | 0 | 0.17.4 SDK 的实际 node_modules 下 `tsc --noEmit` 通过，未改 tsconfig。 |
| `node --experimental-strip-types --test server/changes.test.ts server/handlers.test.ts server/store.test.ts client/changes.test.ts shared/note.test.ts`（修正后） | 0 | 34 passed / 0 failed；随后新增 strict 事件字段回归由最终完整测试覆盖。 |
| `npm test`（最终） | 0 | 67 passed / 0 failed / 0 skipped；此前完整测试为 66 passed，最后增加 SDK 事件 strict schema 验证。 |
| `npm ls` | 0 | 整个 Inbox 直接依赖树无 invalid。 |
| `npm ls @getpaseo/plugin @getpaseo/client @getpaseo/protocol`（最终） | 0 | plugin / client / protocol 全部 0.17.4，client / SDK 引用 deduped；package 与实际安装版本一致。 |
| `git diff --check -- inbox` | 0 | tracked diff 无空白错误；所有 untracked 文件按 no-index diff 审阅，新增差异返回 1 属预期。 |

## 测试覆盖

- SDK 实际 defineSubscription / strict event contract：只允许 invalidate，正文等额外字段被拒绝。
- 服务端广播：两个客户端独立通知、100 次 burst 合并、慢 push 不阻塞快客户端、abort 丢弃 pending、push 失败只关闭当前订阅、cleanup 与重建初始失效。
- 客户端 owner：初始 / ready / event 刷新、closed 与建立失败重试、同步拒绝 / 同步关闭、取消前后陈旧回调隔离、两份 installation 独立清理。
- 真 SQLite + RPC handler：note / scratch / tag / promotion / pin / star / delete / title sync；重复收藏与失败写入不广播；断开期间写入后重读当前数据。
- 模拟 recovery：workspace-first 顺序、成功后失效、provider 失败时部分恢复失效。没有执行真实 daemon 归档或恢复。
- editor 纯逻辑：clean 接收远端正文，dirty 保留本地 title / body；原有 schema 迁移、标签、归档 / missing、project key、筛选与历史分页测试仍通过。

## 上级真实运行时验收

- 本轮未 reload / 安装插件到 daemon，也未 commit / push / publish；checkout 的 node_modules 和 lockfile 已同步。测试临时数据库 / git fixture 由测试 cleanup 删除，无持续服务或 watcher。
- 由主 agent 统一 reload 后，用两个实际 0.17.4 客户端验证 note / scratch / star / tag / delete 与面板同步；断网期间另一端写入，恢复连接后确认全量查询当前数据，而非仅收到历史 replay。
- 纯逻辑测试不能证明 WebSocket 真重连、不同设备 React 挂载时序、query cache 渲染和 plugin reload 的宿主生命周期。
- 归档 workspace / agent、目录仍在或 worktree 需重建、provider 失败和较长恢复等待，仍需明确授权的真实验收；保留内部 DaemonClient 版本耦合风险。
- 保留多个客户端同时编辑时的 last-write-wins 行为；本轮不是协作编辑。广播仅覆盖本 plugin process 的 store 写入与注册 hook，不监控手工 SQLite / 其他进程写入。
