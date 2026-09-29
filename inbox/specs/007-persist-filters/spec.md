# 007 记住筛选

## 目标

Inbox 的筛选选择写入 host settings，重新打开页面、重载插件或重启后仍恢复。全局页面与 Explorer 面板各自记住分组，互不覆盖。

## 已定决策

1. 用 `defineSettings`（id `list-filters`，scope `host`），与 Customize 的看板选择、Activity 的 Explorer 展示偏好同一套机制。不另做设置页；点筛选 chip 即保存。
2. 记住的字段：
   - `kind`：全局页面分组（All / Agents / Notes / Scratch），默认 `all`。
   - `workspaceId`：全局页面的 workspace chip；`null` 表示未选。只在 `kind` 为 `agent` 时作用在列表上。离开 Agents 后选择仍保留，回到 Agents 时恢复（覆盖 002「切走即清除」）。
   - `projectKey`：全局页面的 project chip；`null` 表示未选。只作用于全局页面。
   - `panelKind`：Explorer 面板的分组，默认 `all`。面板不使用 `kind` / `workspaceId` / `projectKey`。
   - `sort`：全局页面排序（Updated / Starred / Created / Name），默认 `updated`。点排序按钮即保存。Explorer 面板不显示该按钮，列表仍按修改时间。已保存的 version 1 文档没有此字段，读取时补上 `updated` 并写成 version 2。
3. 当前选中的 workspace 已不在活动列表里（归档）时，清除 `workspaceId` 并写回。
4. ⌘K / 新建笔记等选中请求仍把全局页面的 `kind`、`projectKey`、`workspaceId` 清回默认并写回，以便打开的条目可见。不改 `sort`。面板上新建笔记或收藏 agent 时，只把 `panelKind` 设为 `all`。
5. 搜索词不写入该文档。
6. 设置尚未读完时不按默认值拉列表。读失败或数据无效时当次用默认筛选，Inbox 仍可打开。

## 验收

- [ ] 全局页面选中 Agents、某个 workspace、某个 project 后，离开 Inbox 再进入，这三项仍选中；workspace 筛选只在 Agents 下作用在列表上。
- [ ] Explorer 面板选中的分组在重开该面板后仍在，且不改变全局页面的分组。
- [ ] 归档正在筛选的 workspace 后，全局页面回到未选 workspace，并在下次打开时保持未选。
- [ ] 从 ⌘K 打开某条 Inbox 时，全局筛选回到 All、未选 workspace、未选 project，该条目可见。排序保持上次的选择。
- [ ] 全局页面切换排序后，离开再进入，按钮图标与列表顺序仍是该排序。Explorer 面板仍按修改时间。
