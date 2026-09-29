# Plan

## 结构

```text
inbox/
  paseo-plugin.json        # id: inbox, requirements.paseo >= 0.9.0
  index.client.tsx         # surface、sidebar item、Command Center、slash command
  index.server.ts          # RPC handlers
  client/
    inbox-surface.tsx      # 列表 + 筛选 + 编辑
    item-row.tsx           # agent / note / scratch 行
    agent-status.ts        # 快照 + 实时状态合并（useAgent selector）
  server/
    store.ts               # SQLite（node:sqlite，不回退 JSONL），~/.paseo/plugin-data/inbox/inbox.db
    project-key.ts         # git remote → 仓库根目录 → cwd
    daemon.ts              # 内部 DaemonClient：workspace 恢复 + refreshAgent（反归档）
    handlers.ts
  shared/
    plugin-id.ts           # PLUGIN_ID = "inbox"
    contracts.ts           # zod RPC
    project-key.ts         # remote URL 规范化（纯函数，可单测）
```

## 数据模型

见 [`contracts/schema.sql`](./contracts/schema.sql)。一张 `items` 表：

| 字段 | 说明 |
|---|---|
| `id` | uuid |
| `kind` | `agent` / `note` / `scratch` |
| `title` | note 可空；agent 为收藏时的标题快照 |
| `body` | note / scratch 正文；agent 可写备注 |
| `project_key` / `project_label` | 分组 key 与显示名（仓库名） |
| `agent_id` | 仅 `kind=agent`，唯一索引，保证不重复收藏 |
| `agent_snapshot` | JSON：provider、model、workspaceId、cwd、title |
| `pinned` | 0/1 |
| `created_at` / `updated_at` | ISO 时间 |

## Project key

`server/project-key.ts` 输入 cwd：

1. 运行 `git -C <cwd> remote get-url origin`，失败时取 `git remote` 列表的第一个 remote。
2. 有 remote：规范化为 `host/owner/repo`（去掉协议、`user@`、`.git`，把 `:` 换成 `/`，转小写 host），key 为 `remote:<规范化值>`。
3. 没有 remote：`git rev-parse --show-toplevel`，key 为 `path:<绝对路径>`。
4. 不是 git 仓库：key 为 `path:<cwd>`。

worktree 的 remote 与主仓库相同，所以自然归到同一组。结果按 cwd 在内存中缓存。label 取 repo 名或目录名。

## 归档 / 反归档

- 状态以实时数据为准：由 RPC `agents.states` 在 server 端用 `paseo.agents.ref(id).refresh()` 批量查询，查不到就标为 `missing`；surface 每 30s 刷新一次，反归档后立即刷新。不用 `useAgent`：state hooks 只能在 workspace panel 里调用，sidebar surface 里调用会报「Plugin state hooks must run inside a workspace panel」（`packages/plugin/src/client/client-state.tsx`）。
- 反归档：RPC `agents.unarchive`，server 端用内部 `DaemonClient`（连接方式沿用 `commands/server/daemon.ts`）：
  1. `fetchAgent(agentId)` 拿到 `workspaceId`；
  2. 如果 daemon 支持 `features.workspaceRecovery`，就 `inspectWorkspaceRecovery(workspaceId)`：`recoverable` → `restoreWorkspace(workspaceId)`；`unavailable` → 抛出 `message`，并且不反归档 agent；`unavailable` + `workspace_not_archived`（workspace 本来就是活动状态）时跳过；
  3. `refreshAgent(agentId)`，与 app 的「Unarchive」按钮走同一条路径（公开 SDK 没有 unarchive）。
- 收藏条目永远不会因为 agent 归档而被自动删除。

## Host

- 数据只写在所在 host；surface 由 Paseo 提供 host picker，`useRpc` 与 `usePaseo` 自动指向当前选中的 host。
- 查询 key 里带上 host 维度（Paseo 为每个 installation 提供独立的 query client，通常不需要额外处理）。

## RPC

见 [`contracts/rpc.md`](./contracts/rpc.md)。

## 空笔记

- `shared/note.ts` 的 `isEmptyNote(title, body)`：两者 trim 后都为空即为空笔记。
- client：「+ Note」和 ⌘K「New Inbox note」只打开草稿（`selection.draftCwd`），不调 RPC。编辑器的保存串行执行：第一次非空保存时创建，之后按 id 更新；内容为空时不保存。编辑器卸载时（返回、切换条目、关闭 surface）flush 未保存内容，内容为空的已存在 note 则删除。
- server：`createNote` 遇到空笔记直接抛错；`InboxStore` 打开数据库时执行 `deleteEmptyNotes()`，清理编辑器中断（例如 app 被杀掉）后残留的空条目。

## UI

- 仅使用 React Native primitives，颜色取自 `theme.colors`，布局随 `layout.compact` 调整。
- 宽屏：左侧列表，右侧编辑器；compact：列表 → 详情两级。
