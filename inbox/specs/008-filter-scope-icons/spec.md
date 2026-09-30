# 008 筛选范围图标

## 目标

全局 Inbox 的 workspace 筛选与 project 筛选用图标区分。两条 chip 的文字都是「名称 · 数量」时，仍能看出哪一行是 workspace、哪一行是 project。

## 已定决策

1. 图标画在 chip 文字前面，只加在 workspace chip 与 project chip 上。分组 chip（All / Agents / Notes / Scratch）不加图标。
2. 图标：
   - workspace：`GitBranch`。原先用 `Folder`，与 project 的 `FolderGit2` 只差一个小 git 角标，12px 下难以分辨；Paseo 侧边栏里 `Folder` / `FolderGit2` 也都表示 workspace 种类，不适合拿来区分 project 与 workspace
   - project：`Folder`。原先用 `FolderGit2`；workspace 换成 `GitBranch` 后已无 git 含义需要重复，用普通文件夹更简洁
   - note / scratch 行内的 project / workspace 标签 chip（013）用同一对图标
3. 未选中时图标为 `foregroundMuted`，选中时与 chip 文字同为 `accentForeground`。
4. 无障碍标签仍是 `Filter by workspace …` / `Filter by project …`，图标不单独朗读。

## 非目标

- Explorer 面板不显示这两行筛选。
- 不按 workspace 种类（worktree / local checkout）换图标。

## 验收

- [ ] Agents 分组下，每个 workspace chip 文字前有分支图标。
- [ ] 每个 project chip 文字前有文件夹图标。
- [ ] 选中 chip 时，图标与文字一起变成强调色。
