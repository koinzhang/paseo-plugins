# 038 — plan

- Pill 目录同步提取独立模块：完整分页、递归 15s 定时、禁止重叠、卸载取消后续注册、推送/快照竞争重放。
- workspace 直接使用 useWorkspace 的 projectId 作为 agent placement 过滤值；该 ID 缺失时回退完整分页。agent_update 直接 setQueryData，不触发全目录请求。
- useAgentTurnEnd 只处理单 agent timeline；workspace 使用单独 useWorkspaceActivityRefresh，明确事件只是刷新提示。
- skillRootsForQuery 改 async，current 为空时 refresh；补项目 SKILL.md 回归。
- 035/037 记录兼容性偏差；审查报告按核查后的结论更新。

## 2026-09-19 状态回归修正

实测同一 agent：无过滤可见，projects.list 的 remote: key 过滤为 0 条。daemon session.buildProjectPlacementFromRecords 将 project.projectId 写入 placement.projectKey。之前错误的过滤导致每 15s 清空状态缓存，覆盖推送所得 permission 状态。本次移除 projects.list 映射与等待；使用 workspace.projectId，测试必须以 daemon 的 placement 形状为基准，并进行真实只读查询验证。

## 同类问题实现

- 状态推送处理提取可测试 helper：cancelQueries(exact) 后恢复取消前捕获的最新缓存 + setQueryData；初始 loader 订阅并缓存分页期间的更新，finally 清理。
- Snapshot 保存 updatedAt，历史工具调用同时计算首末时间；agentUpdatedAt 优先状态快照。
- pill-directory 使用 status / updatedAt / lastUserMessageAt / activeTurn.turnId / workspaceId 版本签名去重，快照与推送共用。
- 用真实 QueryClient 验证晚返回请求无法覆盖 permission；验证首屏增量、时间语义与不变 pill 轮询。

- 隐藏 pill 仍在目录轮询后静默查询用量，只有非空才显示，避免延迟入库且 agent 版本不变时漏掉数据；并发合并，删除/卸载后丢弃晚返回。
