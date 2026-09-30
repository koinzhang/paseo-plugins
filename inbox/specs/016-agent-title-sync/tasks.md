# 016 任务

- [x] `store.refreshAgentTitles` 同步 `agent_snapshot.title` 与 `title` 列（不改 `updated_at`）；`agents.states` 调用并返回 `titlesChanged`；客户端收到后刷新列表。`npm run typecheck` 通过，`npm test` 48 项通过（新增改名同步用例：标题 / 搜索 / updatedAt 不变 / 重复刷新无变化），`paseo plugin reload inbox` 后 running。App 内未实际改名验证。
- [x] 客户端收到 `titlesChanged` 改为 `notifyItemsChanged()`，全局页面与 Workspace 面板同时打开时都刷新（只有先轮询到的那个会拿到 `titlesChanged`）。typecheck / 48 项测试通过，reload 后库内两个收藏 agent 标题与 `paseo agent inspect` 的 Name 一致。
