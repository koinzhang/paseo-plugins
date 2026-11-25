# 017 Tasks

- [x] 核对基线、inbox 干净状态、已安装依赖和上游 / 运行时版本。验证：git / package manifests / `paseo --version`；锚点记录于 research。
- [x] 读取 migration / hooks、001 / 007 / 011 / 012 / 016 spec 与实际代码。验证：逐项对照 SDK 导出、client、app 缓存、protocol 和 server handler。
- [x] 记录候选改进、不采用原因和需要主 agent 决定的新契约 / 依赖边界。验证：research 的八项对照与 spec 的保留决策；未修改运行时代码。
- [x] 执行现有依赖下的类型检查和最小回归检查。验证：下列命令退出码均为 0；22 项测试通过。
- [x] 查看 inbox 全部 diff，包括四个 untracked 文档。验证：`git diff -- inbox`、逐文件 `git diff --no-index -- /dev/null <file>`、`git status --short -- inbox`；生产路径 diff 为空，只有 specs 索引和本目录四个文件。

## 已执行验证

工作目录：`inbox/`，检查串行执行，未安装依赖。

| 命令 | 退出码 | 结果 / 覆盖 |
|---|---|---|
| `npm run typecheck` | 0 | `tsc --noEmit`，现有 0.15.1 SDK 下无类型错误；不是 0.17.4 依赖编译验证。 |
| `node --experimental-strip-types --test shared/agent-status.test.ts shared/last-exchange.test.ts shared/slash-command.test.ts shared/project-key.test.ts server/tags.test.ts` | 0 | 22 passed / 0 failed / 0 skipped；覆盖归档 / missing 状态优先级、最后对话分页与拼接、slash scratch 参数、project key 和标签一致性。 |
| `git diff --check -- inbox`（仓库根目录） | 0 | tracked diff 无空白错误；新增文档通过逐文件 diff 人工检查。 |

## 未执行与后续决策

- 主 agent 已串行执行完整 `npm run typecheck` 与 `npm test`，均 exit 0，48 passed / 0 failed；包含 SQLite store、过滤设置与面板测试。真实 GUI / 恢复操作仍未执行。
- 未安装 0.17.4 SDK / client，也未更新 lockfile；仅当主 agent 批准新的订阅契约或内部 client 对齐时才需要安装、重新 typecheck 并复查最低版本。
- 未执行 `paseo plugin reload inbox` 或 GUI 验收；文档改动不需要 reload。若主 agent 后续改代码，需验证收藏 / scratch、跨客户端刷新、active / archived / missing、归档 workspace 的恢复与标签删除线。
- 特别需要确认长时间 workspace recovery：0.15.1 内部 client 的 150s 超时与 0.17.4 的等待终态语义不同；此项只有源码证据，没有真实复现。
