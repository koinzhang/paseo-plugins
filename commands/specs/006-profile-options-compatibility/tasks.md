# Tasks

- [x] 核对 SDK、上游源码与既有变更范围；证据记录在 `research.md`。
- [x] 增加 profile options 回归测试，复现旧实现失败；`node --experimental-strip-types --test shared/commands.test.ts` 退出 1，旧 20 项通过、新 4 项失败。错误包括 `Profile "Current" has nothing to apply to this agent. Ignored: options.`。
- [x] 实现新字段优先、旧字段回退，保持 server RPC 与已暴露 feature 限制；`shared/commands.ts` 仅增加字段类型、已知字段名和优先读取逻辑三处。
- [x] 单独运行相关测试；同一命令修复后退出 0，24/24 通过，含 4 项新增回归与全部 20 项原有参数/命令测试。该结果在观察到外部依赖变化前已取得，无法确认外部安装的具体时间。
- [x] 运行 typecheck；修改前 `npm run typecheck` 退出 2，唯一诊断为已有 `client/commands.ts(174,28)` 的 TS2339。修复后第二次实际退出 0；期间外部将 SDK 从 0.15.1 更新为 0.17.4，并修改 `npm-shrinkwrap.json`，不是本次执行者安装或写入。
- [x] 检查 `git diff -- commands` 与所有未跟踪文件的 `git diff --no-index -- /dev/null <file>`；后者存在差异的退出 1 是 diff 正常结果。`git diff --check -- commands` 单独退出 0。
- [x] 确认本次仅修改 `shared/commands.ts`、`shared/commands.test.ts` 和新增本目录四份文档，没有写起始已有 005 文件、锁文件或其他插件。

完整 `npm test`、依赖安装/锁文件归属核对、插件 reload、桌面设置和 turn 交互由主 agent 统一执行。本次没有启动 daemon、测试 agent 或常驻进程，没有生成临时文件。
