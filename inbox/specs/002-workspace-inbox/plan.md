# Plan

## 数据

`items` 增加一列与索引（启动时检测 `PRAGMA table_info(items)`，缺列则 `ALTER TABLE`，旧数据为 `NULL` = 全局）：

```sql
ALTER TABLE items ADD COLUMN workspace_id TEXT;
CREATE INDEX IF NOT EXISTS items_workspace ON items(workspace_id);
```

`Item` 增加 `workspaceId: string | null`。

## Store

- `list(filter)`：`workspaceId` 为 `undefined` 不过滤、`null` 只取全局、字符串只取该 workspace；`hiddenWorkspaceIds` 排除这些 workspace 的条目。
- `projects(hidden)` / `workspaces(hidden)`：按可见条目聚合计数；`workspaces` 按 `MAX(updated_at)` 降序。
- `workspaceIds()`：库里出现过的所有非空 `workspace_id`，用来与活动列表求差得到隐藏集合。
- `createNote({ ..., workspaceId })`；`starAgent(agentId, snapshot, project, workspaceId?)`：已存在且传入了不同的 `workspaceId` 时更新归属（全局 → workspace）；未传时保持原样。

## RPC 变化

| name | 变化 |
|---|---|
| `items.list` | input 增加 `workspaceId?: string \| null`；output 增加 `workspaces: { id, label, count }[]`（仅活动 workspace） |
| `items.save` | input 增加 `workspaceId?`（仅新建时生效） |
| `agents.star` | input 增加 `workspaceId?` |
| `agents.candidates`（新） | `{ workspaceId }` → `{ agents: { id, title, provider }[] }`：该 workspace 未归档的 agent |

`items.list` handler：`paseo.workspaces.list` 分页（每页 200）得到活动 `id → name`；`hidden = store.workspaceIds() − 活动集合`；失败时 `hidden = []` 并 `console.error`。

## Client

- `client/inbox-surface.tsx` 抽出 `InboxView`，参数 `workspace?: { id, directory }`：
  - 无 `workspace`（sidebar 页面）：多一行 workspace 筛选 chip：仅各 workspace（`label · count`），点选 / 再点取消，只在 `kind = agent` 时显示（`items.list` 的 `workspaces` 计数按 `kind` 过滤）。007 起离开 Agents 不清除已选 workspace，只是不作用在列表上。无 workspace 条目时不显示这一行；条目副标题带 workspace 名；接收 ⌘K 选中请求。选中的 workspace 不在 `workspaces` 返回里（被归档）时回到全部。
  - 有 `workspace`（Explorer 面板）：列表固定按该 workspace 过滤，不显示 project / workspace 筛选；「+ Note」草稿带 `cwd = directory`、`workspaceId`；「+ Agent」展开候选列表；强制 compact。
- `client/workspace-panel.tsx`：`useWorkspace(workspaceId, w => ({ id, directory }))`（state hook 只能在 panel 里用），渲染 `InboxView`。
- `index.client.tsx`：`addWorkspacePanel({ id: "workspace-inbox", title: "Inbox", icon: "Inbox", context: "workspace", locations: ["explorer"] })`。
