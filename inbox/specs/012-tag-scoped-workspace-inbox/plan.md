# 012 Plan

## Schema

- `items` 新增 `workspace_label TEXT`（迁移时 `ALTER TABLE`）。
- 启动回填：`kind = 'agent' AND workspace_id IS NULL` 的行取 `json_extract(agent_snapshot, '$.workspaceId')`。

## Server

- `server/directory.ts`：`loadDirectory(paseo, resolveProject)` 分页读 `workspaces.list`，再读 `projects.list`（失败只影响无活动 workspace 的 project）。每个 Paseo project 按 `projectRootPath` 解析 Inbox key。返回：
  - `projects: Map<key, label>`
  - `workspaces: Map<id, { label, projectKey, projectLabel }>`
- `store.ts`
  - `list({ kind, projectKey, workspaceId, inboxOf, query, sort })`：`inboxOf = { workspaceId, projectKey }` 为面板规则（spec 决策 4）；去掉 `hiddenWorkspaceIds`。
  - `projects(kind)` / `workspaces(kind)`：不再隐藏归档项；workspace 汇总带 label 快照。
  - `setTags(id, { project, workspace })`：只允许 note / scratch，且有 workspace 必须有 project。
  - `refreshLabels(directory)`：把活动 project / workspace 的当前名称写回快照。
  - `starAgent(agentId, snapshot, project, workspace)`：已收藏直接返回，不再移动。
- `handlers.ts`
  - `items.list`：加载目录 → 回写名称 → 查询；输出 `archived: { projects, workspaces }`（所有被引用、且不在活动目录中的 key / id），汇总带 `archived`。
  - `items.save`：新建时 `workspaceId`（打 workspace + project）或 `projectOfWorkspace`（只打 project）；去掉 `cwd`。
  - `items.tag`：`{ id, projectKey, workspaceId }`，按 spec 决策 2 校验。校验逻辑放在纯函数 `resolveTags`（`server/tags.ts`）里单测。
  - `tags.options`：活动 project 与 workspace（带 `projectKey`）。
  - `agents.star`：去掉 `workspaceId` 输入；标签从 agent 所在 workspace 推出。
  - `agents.candidates`：排除已收藏的 agent。

## Client

- 面板查询 `items.list({ inboxOf: workspace.id })`；全局 workspace chip 用 `workspaceId`。
- `ItemRow` 副标题：project / workspace 标签用嵌套 `Text`，归档时加 `textDecorationLine: "line-through"`。
- `Detail`：标签行（project chip、workspace chip）。note / scratch 点 chip 展开内联选择列表（同 `AgentPicker` 的样式）；agent 只读。
- 草稿：`SelectionRequest` 的 `draftCwd` 改为 `draft: { workspaceId? , projectOfWorkspace? }`。
- `/inbox`：`parseInboxCommand` 只 trim。
