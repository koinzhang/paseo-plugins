# 002 Workspace Inbox

## 目标

- 在右侧 Explorer 增加 **workspace 级别的 Inbox** 面板：收藏本 workspace 的 agent、记笔记（note / scratch），数据只归属该 workspace。
- 全局 Inbox 页面增加 **workspace 筛选**：只在 **Agents** 分组下显示（chip 计数为该 workspace 的 agent 数），点某个 workspace chip 只看该 workspace 的数据，再点一次回到全部。为避免筛选栏过长，不提供「All workspaces」「Global」chip（RPC 仍支持 `workspaceId: null` 只取全局数据）。007 起该选择写入 settings：离开 Agents 时不作用在列表上，回到 Agents 时恢复，不再在切走时清除。
- workspace 归档后，全局 Inbox 页面**隐藏**该 workspace 的 Inbox 数据。

## 已定决策

1. **归属**：每个条目有可空的 `workspace_id`。`NULL` 为全局 Inbox（001 的所有入口：⌘K、`/inbox`、sidebar 页面「+ Note」）；非空为该 workspace 的 Inbox（Explorer 面板里创建的条目）。
2. **一个 agent 仍只收藏一次**（沿用 001 的唯一索引）。在 workspace 面板收藏一个已在全局 Inbox 的 agent 时，把该条目移入该 workspace；从 ⌘K / `/inbox` 再次收藏已属于某 workspace 的 agent 时保持原归属不变。
3. **归档只隐藏，不删除**：全局页面以 `paseo.workspaces.list`（只返回活动 workspace）为准，`workspace_id` 不在活动列表里的条目不出现在列表、project 计数和 workspace 筛选里。workspace 恢复后条目自动重新出现。`workspaces.list` 调用失败时不做隐藏（避免把数据整页藏掉），并记录日志。
4. **Workspace 名称实时取**：筛选 chip 与条目副标题中的 workspace 名称来自 `workspaces.list` 的 `name`，不在库里存快照。
5. **Explorer 面板**：`addWorkspacePanel({ context: "workspace", locations: ["explorer"] })`，固定使用 compact 布局（列表 → 详情两级）；新 note 的 project 按 workspace 目录解析。面板不响应 ⌘K 的选中请求（那些仍打开全局页面）。
6. **面板内收藏 agent**：「+ Agent」列出本 workspace 中未归档、尚未在本 workspace Inbox 里的 agent，点击即收藏并留在列表（不打开该 agent 的详情；RPC `agents.candidates`，server 端 `paseo.agents.list` 后按 `workspaceId` 过滤）。

## 用户故事

- 在某个 workspace 打开右侧 Explorer 的 Inbox 面板，点「+ Note」写一条笔记；它只出现在这个 workspace 的面板里，并在全局页面「该 workspace」筛选下可见。
- 在面板点「+ Agent」，从本 workspace 的 agent 列表里选一个收藏；之后在面板里点它跳回该 agent。
- 在全局 Inbox 页面，默认看到全局 + 所有活动 workspace 的数据；点某个 workspace 名只看该 workspace 的数据，再点一次取消。
- 归档某个 workspace 后，全局页面里它的条目与筛选 chip 消失；恢复该 workspace 后重新出现。

## 非目标

- workspace 之间移动条目的 UI、把 workspace 条目移回全局。
- 归档 workspace 时删除其 Inbox 数据。
- 在全局页面直接为某 workspace 新建条目。

## 验收

- [ ] Explorer 出现 Inbox 面板；在面板里新建的 note / 收藏的 agent 只出现在该 workspace 的面板中。
- [ ] 面板内分组（All / Agents / Notes / Scratch）、搜索、置顶、删除、Unarchive、Open agent 可用；深浅主题文字颜色正确。
- [ ] 「+ Agent」只列出本 workspace 未归档且未收藏到本面板的 agent；全局已收藏的 agent 在面板收藏后移入该 workspace。
- [ ] 全局页面 workspace 筛选：仅 Agents 分组下显示并作用在列表上；只有 workspace chip（没有 workspace 条目时整行隐藏）；选中只显示它的条目，再点取消。离开 Agents 后选择保留，回到 Agents 时恢复（007）。
- [ ] 全局页面条目副标题显示所属 workspace 名称。
- [ ] 归档 workspace 后，全局页面不再显示其条目、project 计数不含其条目、筛选 chip 消失；当前正选中该 workspace 筛选时回到全部。
- [ ] 旧库（无 `workspace_id` 列）启动后自动迁移，原有条目都归入全局 Inbox。
