# 017 Paseo 0.17.4 / SDK 适配审查

## 目标

比较当前 Inbox 的 0.15.1 依赖与 Paseo 0.17.4 源码，判断是否存在值得采用、且能在授权范围内完整验证的改进。没有充分收益或需要未授权的新依赖 / public contract 时，不机械升级或替换。

必须保留收藏、归档后留存、先恢复 workspace 再反归档 agent、notes、`/inbox`、全局标签过滤和现有 SQLite 格式。

## 审查结果

1. 本次只交付审查文档，不修改运行时代码、依赖、manifest 或数据库。
2. 0.17.4 的 `defineSubscription` / `useSubscription` 值得考虑用于服务端写入后的跨客户端刷新，但需要新增订阅契约、升级 SDK，并验证重连和失败降级。本轮授权要求把这些决定交给主 agent，未实现。
3. 新增的 `useAgents` / `useWorkspaces` / `useProjects` 提供共享缓存和跨 host 引用；不能直接替换 Inbox 的服务端状态 / 目录查询：缓存会排除 archived agent，project key 也不是 Inbox 现有 git remote key。采用需要保留查询后备与 host 隔离，不是机械替换。
4. 公开 `agent.reload()` 最终调用内部 `refreshAgent()`，但未提供 workspace recovery；保留现有内部 DaemonClient 恢复顺序。公开 `agent.refresh()` 仍只是读取，不用于反归档。
5. 新增文件面板 API 和实体 metadata 不是 SQLite 替代；不迁移 Inbox 数据或把 notes 写入 agent metadata。
6. 保留现有 SDK / client `0.15.1` 和 `requirements.paseo >=0.15.0`。源码审查与本地静态检查不等于已在 0.17.4 真实界面验收。

## 非目标

- 安装 / 更新依赖、reload、发布或修改其他插件。
- 引入新的订阅 public contract 或改变历史对话的读取预算。
- 修复与此次 SDK 审查无关的历史文档或产品行为。

## 完成标准

- 版本锚点与逐项源码依据记录于 `research.md`。
- 每项候选接口记录当前实现、收益及不采用原因。
- 运行现有类型检查和最小相关回归检查，记录命令与退出码。
- 审阅全部 inbox diff 与新增文件，确认不触碰运行时代码 / 依赖 / 数据。
- 明确列出尚未执行的真实运行时验收及主 agent 的决策点。
