# 013 Notes / Scratch 也显示范围筛选

## 目标

012 起 note / scratch 也带 project / workspace 标签。全局 Inbox 页面在 **Agents / Notes / Scratch** 下都显示 project 与 workspace 筛选，并把 project 行放在 workspace 行上方。取代 010 的「只在 Agents 下显示」。

## 已定决策

1. 全局页面在 Agents / Notes / Scratch 下渲染 project chip 行与 workspace chip 行，project 在上。All 下两行都不出现，也不缩小列表。没有对应条目时该行不显示。Explorer 面板继续不显示这两行。
2. 计数按当前分组（`items.list` 的 `projects` / `workspaces` 已按 `kind` 统计）。
3. `projectKey` / `workspaceId` 仍是一份全局选择，跨 Agents / Notes / Scratch 共用。当前分组的 chip 列表里没有已选的 project 或 workspace 时清除该选择，避免列表被一个看不见的 chip 过滤成空。

## 验收

- [ ] Notes / Scratch 下，有带标签的条目时显示 project 与 workspace chip，project 行在上；点选后列表按标签过滤。
- [ ] Agents 下行为不变（行序改为 project 在上）。
- [ ] All 下不显示两行，列表不受已选 project / workspace 影响。
