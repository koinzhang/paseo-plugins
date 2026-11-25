# 087 — tasks

## 第一阶段（旧 SDK，历史验收）

- [x] T1 核对范围与版本 — 验证：仓库 HEAD `5326249867269f7cda3a70315d584a3da886a218`；上游 HEAD / runtime / 本地 SDK 见 research；开始时 activity 无改动，commands 已有其他 Agent 改动，保留。
- [x] T2 审查 migration / hooks / SDK 实现并记录取舍 — 验证：research 的证据表；本目录 spec / plan 先于实现建立。
- [x] T3 修复 timeline 类型来源 — 验证：`cd activity && npm run typecheck` 最终 exit 0；client/server/shared/入口的 deprecated API 与旧 timeline 类型来源搜索无命中（rg exit 1）。
- [x] T4 hook promise 与取消保护 — 验证：`node --experimental-strip-types --test server/turn-ingest.test.ts` 实现前 exit 1，原有 5 条通过、新增 3 条失败；最终 9 条 turn 测试全部通过，包含真实 SQLite 关闭后的迟到响应测试。
- [x] T5 最小相关测试与完整 diff 检查 — 验证：下方命令记录；5 个 tracked 文件和 4 个新 spec 的完整 diff 均审阅，所有本 Agent 变更仅在 activity；其他插件的并行改动保留。
- [x] T6 主 Agent 完整测试与 reload — `npm test` 263/263 通过；reload 后 running，SQLite ready，日志出现真实 turn.after 入库，Workspace Activity 页面可见统计与 agent 列表。

## 第二阶段（用户新目标：彻底对齐 0.17.4）

此前保留 0.15.1 和 wholeTurns 延期的保守方案已被本阶段取代。以下验收必须在实际新 SDK 下重新执行。

- [x] T7 更新 spec / plan / research / tasks — 验证：本阶段目标、许可安装范围、严格 turnId 过滤、后台不变与 >=0.17.4 边界先于代码记录。
- [x] T8 固定并安装 SDK 0.17.4 — 验证：授权 npm install exit 0，package / lock / node_modules 一致，npm ls exit 0 无 invalid，plugin / client / protocol 全部 0.17.4；manifest / README / CHANGELOG 同步。
- [x] T9 新 SDK 整轮采集与必要类型迁移 — 验证：实际完整 typecheck exit 0，15 条 turn 测试通过，含 601 条单轮条目、跨轮 / null / 幂等 / 取消 / model refresh；实际新 exports / deprecated API / RPC transform 复核见 research。
- [x] T10 新 SDK 全量测试与范围检查 — 验证：npm test exit 0（269 pass / 0 fail）；diff check exit 0，14 个 tracked 和 4 个新 spec 的完整 diff 已检查，变更仅在 Activity。
- [ ] T11 主 Agent 新版本实机验收 — 本阶段不 reload；由主 Agent 统一 reload、GUI 与真实 turn.after 日志核验。

## 第一阶段实际验证记录

| 命令（测试在 activity 执行） | Exit code | 结果 |
|---|---|---|
| `node --experimental-strip-types --test server/turn-ingest.test.ts`（修复前） | 1 | 5 pass / 3 fail，复现已取消后仍读取和写库 |
| `npm run typecheck`（首次实现） | 2 | TS2339：本地 AbortSignal 类型没有 any；移除多余 lifetime 后解决 |
| `node --experimental-strip-types --test server/turn-ingest.test.ts server/ingest.test.ts server/messages.test.ts server/resolve-model.test.ts`（首次实现） | 0 | 28 pass；之后补充真实 SQLite 关闭测试 |
| `npm run typecheck`（最终实现） | 0 | 当前安装 SDK 0.15.1 的完整 Activity 类型检查通过 |
| `node --experimental-strip-types --test server/turn-ingest.test.ts server/ingest.test.ts server/messages.test.ts server/resolve-model.test.ts`（最终实现） | 0 | 29 pass / 0 fail；含新增 4 条取消 / SQLite 关闭回归 |
| `git diff --check -- activity` | 0 | 无 whitespace 问题 |
| `git diff -- activity`；逐个新 spec 的 `git diff --no-index -- /dev/null <file>` | 0 / 1 | tracked 与 untracked 全部审阅；no-index exit 1 表示存在新增内容 |

一次 diff 审阅辅助 shell 使用了 zsh 特殊变量 `path`，覆盖 PATH 导致后续 git / rg 找不到（exit 127）；改为 `file_path` 后重新执行成功。该错误不涉及文件修改、构建或测试。

所有测试临时目录由 finally 删除；没有启动持久进程，没有执行依赖安装、reload、提交、push 或 publish。

主 Agent 后续验收：完整 `npm run typecheck` 与 `npm test` 均 exit 0（263 pass / 0 fail）；`paseo plugin reload activity` exit 0，`paseo plugin ls` 为 running。重载后的日志包含 `store ready (driver=sqlite)` 和真实 `turn.after ... rows=...`；只读 GUI 确认 Workspace Activity 正常展示统计、Agents 与 MCP。未在 SDK 0.17.4 依赖下重新编译，依赖仍为 0.15.1。

## 第二阶段实际验证记录（SDK 0.17.4）

| 命令（除 git 外在 activity 执行） | Exit code | 结果 |
|---|---|---|
| `npm install --ignore-scripts --no-audit --no-fund`（sandbox） | 1 | ENOTFOUND registry.npmjs.org；未盲目重试 |
| 同一 install 命令（批准网络权限后） | 0 | changed 5 packages：plugin / client / protocol / relay 更新到 0.17.4，既有 ws 随依赖解析更新为 8.23.0；没有新增无关直接依赖 |
| `npm ls @getpaseo/plugin @getpaseo/client @getpaseo/protocol` | 0 | 三者均 0.17.4，protocol deduped，无 invalid |
| `npm ls --all --json`（pipefail，解析摘要） | 0 | 全依赖树 problems=[]，非仅 SDK 子树通过 |
| Node 逐个读取三个 node_modules package.json 和 lock SDK 节点 | 0 | 六个读回版本均 0.17.4，根 devDependency 同步 |
| `npm run typecheck`（安装后首次） | 2 | 新 PluginHookAgent 必需 background / metadata，adapter 和 fixture 缺失 |
| `npm run typecheck`（修正新 hook 字段后） | 2 | 实际新 snapshot 协议的两个字段仍 optional；改为按当前协议规范化 |
| `node --experimental-strip-types --test server/turn-ingest.test.ts` | 0 | 15 pass / 0 fail，保留原采集与取消测试并新增整轮过滤 / 长轮次回归 |
| `npm run typecheck`（最终） | 0 | 实际 SDK 0.17.4 下完整 Activity 类型检查通过 |
| `npm test`（最终） | 0 | 269 pass / 0 fail，50 suites，约 1.1 秒；无 skipped / canceled |
| `git diff --check -- activity` | 0 | 无 whitespace 问题 |
| deprecated API / 0.15.1 / 旧 tail helper 源码搜索 | 1 | 无命中；旧版本历史文档保留，不是当前可执行兼容代码 |
| `git diff -- activity`、新 spec 的 no-index diff | 0 / 1 | 完整审阅 tracked / untracked；no-index exit 1 是有新增内容的正常结果 |

全量测试仍输出既有 `workspace project roots unavailable` 降级日志：background-sync 的 mock fixture 没有 workspaces.list，代码捕获后继续；原有失败重试测试还故意产生 temporary failure 日志。已核对执行路径，均不是新 SDK 失败，未修改无关 fixture 或背景扫描逻辑。

第二阶段未 reload、提交、push 或 publish；未启动持久进程，测试临时目录均由 finally 删除。T11 仍待主 Agent 对升级后的插件统一实机验收。
