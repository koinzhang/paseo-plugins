# 014 All 也显示范围筛选

## 目标

agent / note / scratch 都带 project / workspace 标签，全局 Inbox 页面在 **All / Agents / Notes / Scratch** 四个分组下都显示 project 与 workspace 筛选。取代 013 的「All 下不显示、不作用」。

## 已定决策

1. 全局页面四个分组都渲染 project chip 行与 workspace chip 行，project 在上。没有对应条目时该行不显示。Explorer 面板继续不显示这两行。
2. 计数按当前分组；All 下统计全部条目（`items.list` 不带 `kind` 时 `projects` / `workspaces` 不按类型过滤）。
3. `projectKey` / `workspaceId` 仍是一份全局选择，在四个分组下都作用在列表上。当前分组的 chip 列表里没有已选的 project 或 workspace 时清除该选择（All 下同样适用）。
4. 全局页面点 New note 时切到 All，并清除 project / workspace 选择，保证新建的无标签笔记保存后出现在列表里。
5. 从 ⌘K 打开某条 Inbox 时仍回到 All、未选 workspace、未选 project（007）。

## 验收

- [ ] All 下有带标签的条目时显示 project 与 workspace chip，点选后列表按标签过滤，计数为全部类型之和。
- [ ] 在 All 选中的 project / workspace，切到 Agents / Notes / Scratch 后仍生效；该分组没有对应 chip 时自动清除。
- [ ] 选中 chip 后点 New note，筛选被清除，保存的笔记出现在列表里。
