# 012 Workspace Inbox 由全局数据按标签过滤

## 目标

- 只有一份数据：全局 Inbox。每个条目带可选的 **project 标签**和 **workspace 标签**；Workspace Inbox（Explorer 面板）只是全局数据按标签过滤后的视图，不再有「归属于某 workspace」的独立数据。
- 全局页面可以给 note / scratch 设置、修改、清除 project 与 workspace 标签；打上某 workspace 标签后，条目自动出现在该 workspace 的 Inbox 面板里。
- 在 workspace 面板里新建的条目同样出现在全局页面（本来就在同一张表里，现在语义也一致）。
- `/inbox` 移除 `-w` / `--workspace`。
- project / workspace 被归档后，条目不再隐藏；标签以删除线显示，与活动的区分开。

取代 002 决策 1（归属）、2（收藏移入 workspace）、3（归档隐藏）和 004 全部内容。

## 已定决策

1. **标签即字段**：沿用 `project_key` / `project_label` / `workspace_id`，新增 `workspace_label`（名称快照）。`workspace_id` 的含义从「归属」改为「标签」。
2. **一致性校验（server 端）**：workspace 标签必须属于条目的 project 标签。
   - 只设 workspace：project 自动设为该 workspace 的 project。
   - 同时给出 project 与 workspace 且不一致：拒绝（「Workspace X belongs to project Y」）。
   - 只能选活动的 project / workspace；已有的归档标签可以保留，但不能新选。
   - UI：有 workspace 标签时，project 选择里其他 project 置灰，提示先清除 workspace；workspace 选择只列当前 project 下的 workspace（无 project 时列全部）。
3. **Project 身份**：继续用 Inbox 自己的 project key（git remote → 仓库根 → 目录），这样旧数据不用迁移。Paseo 活动 project 按 `projectRootPath` 解析出同样的 key；workspace 的 project = 它所属 Paseo project 的 key。活动 project 的显示名取 Paseo 的 `projectDisplayName`，并回写快照。
4. **Workspace 面板过滤规则**：`workspace_id = W`，或 `workspace_id IS NULL AND project_key = project(W)`。也就是说，只打了 project 标签的条目会出现在该 project 的所有 workspace 面板里。
5. **收藏的 agent**：标签由 agent 自身决定，不可编辑：workspace = agent 所在 workspace，project = 该 workspace 的 project（取不到时按 cwd 解析）。旧库中 `workspace_id` 为空的 agent 条目启动时按快照里的 `workspaceId` 回填。面板「+ Agent」列出本 workspace 中尚未收藏的 agent；收藏后因标签匹配出现在面板里。
6. **新建时的默认标签**：
   - 面板 + Note：该 workspace 及其 project。
   - ⌘K *New Inbox note*（workspace 上下文）与 `/inbox <text>`：只打当前 workspace 的 project 标签。
   - 全局页面 + Note：无标签。
7. **归档判定**：以 `workspaces.list` / `projects.list`（只返回活动的）为准，不在其中即为归档。这两个接口都取不到归档项的名称，所以用库里的标签快照显示。目录读取失败时不标记任何归档（避免整页划线），并记录日志。
8. **全局筛选**：workspace / project chip 仍只在 Agents 分组显示（010）；归档的 workspace / project 也有 chip，同样以删除线显示。workspace chip 精确匹配 `workspace_id`。
9. **`/inbox`**：参数整体就是 scratch 文本，`-w`、`--` 不再特殊处理。

## 非目标

- 一个条目打多个 workspace / project 标签。
- 编辑 agent 条目的标签。
- 在 Paseo 侧归档时删除 Inbox 数据。

## 验收

- [ ] 全局页面 note / scratch 详情可设置、清除 project 与 workspace 标签；打上 workspace 标签后该条目出现在对应面板中。
- [ ] 已有 project A 标签时选不了 project B 下的 workspace；server 拒绝不一致的请求（单测）。
- [ ] 面板里新建的 note 在全局页面可见，并带该 workspace 与 project 标签。
- [ ] 面板显示本 workspace 标签的条目，以及只有同 project 标签的条目（单测）。
- [ ] `/inbox -w foo` 记为 scratch「-w foo」；`/inbox` 收藏当前 agent 后在该 workspace 面板可见。
- [ ] 归档 workspace / project 后，全局页面仍显示相关条目，标签（列表副标题、详情、chip）加删除线；恢复后删除线消失。
- [ ] 旧库启动后：原 workspace 条目保留标签；无 workspace 的 agent 条目按快照回填。
