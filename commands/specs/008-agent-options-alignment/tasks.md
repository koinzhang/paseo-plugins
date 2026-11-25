# Tasks

- [x] 核验公开 setOptions、bundle notice、controls、null 和旧键归一化源码；见 research。
- [x] 实现 controls/options 共享适配与 supported-key 校验；`shared/agent-options.test.ts` 5 项通过，覆盖官方默认值、现代空控件优先、旧 snapshot 和 provider-owned value 校验。
- [x] `/feature` 改用 server 公开 setOptions；server 测试覆盖 current snapshot、null reset、未知/消失控件、原样 rejection 和缺失 agent。共享命令新增 `--default` 与现代 control/current choice 测试。
- [x] `/profile` 输出 options 单次 bundle，保留 notice，移除旧逐字段写回退；server 测试覆盖一次 bundle、model-dependent value 留给 provider、未知键、空 options、能力缺失与拒绝反馈；共享测试确认旧 profile 输入仍输出现代 options。
- [x] `cd commands && node --experimental-strip-types --test shared/*.test.ts server/*.test.ts`：exit 0，65/65 通过，含本轮 20 项新增测试。使用真实公开 createPaseoApi/AgentHandle wrapper 与 fake DaemonClient transport，不建立真实 daemon 连接。
- [x] `cd commands && npm run typecheck`：exit 0，无 TypeScript 诊断；这是执行时工作副本结果，不认领并发 client 改动。
- [x] `cd commands && npm ls @getpaseo/plugin @getpaseo/client @getpaseo/protocol`：exit 0，三包均 0.17.4；plugin 的 client/protocol peer 均 deduped，没有运行安装命令。
- [x] `git diff --check -- commands/shared commands/server commands/specs/008-agent-options-alignment`：exit 0；检查完整 scoped tracked diff 和所有新增文件 `git diff --no-index -- /dev/null <file>`。后者有差异时的 exit 1 是正常 diff 结果。
- [x] 初次交付客户端共享适配接口；当时已告知主 agent `client/agent-state.ts` 返回 AgentState 时补充 `controls: agent.controls` 与 `options: agent.options`，并保留 features 兼容输入；初次交付未修改该 client 文件。
- [x] 后续追加授权：loadAgentState 使用 `optionFeatures(agent)` 构建显示值，并向共享 plan 传入 `controls/options`；不修改其他 client 文件。
- [x] 接线前 `cd commands && node --experimental-strip-types --test client/agent-state.test.ts`：exit 1，6 项中 2 项通过、4 项失败；复现 helper 未接线、新值被 legacy features 覆盖、空 controls 被旧列表覆盖及默认值错误。
- [x] 接线后 `cd commands && node --experimental-strip-types --test shared/*.test.ts server/*.test.ts client/agent-state.test.ts`：exit 0，71/71 通过，含 6 项新增 loader 回归；第一项测试把实际 loader 输出交给 planFeature/planProfile，确认连接有效。
- [x] 接线后 `cd commands && npm run typecheck`：exit 0，无诊断；没有观察到其他会话并发写入造成的测试或类型检查失败。
- [x] 查看 loader 完整 tracked diff 和新增测试的 no-index diff；`git diff --check -- commands/client/agent-state.ts commands/shared commands/server commands/specs/008-agent-options-alignment`：exit 0。除唯一追加授权的 loader/test 外，未改其他客户端文件。

## 主 agent 验收

- 核验实际 `/feature` picker、profile 和 `--default` 行为；loader 接线已另获授权在本任务补齐，本轮没有进行真实 agent 设置修改。
- 005 Composer 与 007 Esc 的 client 修改、最终 manifest requirements 下界、README/CHANGELOG/spec 总索引由另一会话与主 agent 负责。本轮没有修改这些文件。
- `/profile` 仍经内部 DaemonClient 的现代 `applyAgentConfig` bundle，`/rename` `/cancel` 的旧内部方法未改；不宣称所有命令均已消除内部 SDK 接口。
- 主 agent 统一跑全插件测试、reload 与真实交互；本轮未 spawn、reload、commit、push 或 publish，没有启动常驻进程或创建临时文件。
