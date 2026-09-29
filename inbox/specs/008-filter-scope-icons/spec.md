# 008 筛选范围图标

## 目标

全局 Inbox 的 workspace 筛选与 project 筛选用图标区分。两条 chip 的文字都是「名称 · 数量」时，仍能看出哪一行是 workspace、哪一行是 project。

## 已定决策

1. 图标画在 chip 文字前面，只加在 workspace chip 与 project chip 上。分组 chip（All / Agents / Notes / Scratch）不加图标。
2. 图标沿用 Paseo 侧边栏与设置里的字形：
   - workspace：`Folder`（侧边栏普通 workspace）
   - project：`FolderGit2`（设置里的 Projects）
3. 未选中时图标为 `foregroundMuted`，选中时与 chip 文字同为 `accentForeground`。
4. 无障碍标签仍是 `Filter by workspace …` / `Filter by project …`，图标不单独朗读。

## 非目标

- Explorer 面板不显示这两行筛选。
- 不按 workspace 种类（worktree / local checkout）换图标。

## 验收

- [ ] Agents 分组下，每个 workspace chip 文字前有文件夹图标。
- [ ] 每个 project chip 文字前有带 git 标记的文件夹图标。
- [ ] 选中 chip 时，图标与文字一起变成强调色。
