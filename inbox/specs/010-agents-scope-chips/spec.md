# 010 Agents 分组才显示范围筛选

## 目标

全局 Inbox 页面只在选中 **Agents** 时显示 workspace 与 project 筛选。All / Notes / Scratch 下这两行不出现，也不缩小列表。

## 已定决策

1. 全局页面的 workspace chip 与 project chip 都只在分组为 Agents 时渲染。没有对应条目时该行仍不显示。Explorer 面板继续不显示这两行。
2. 已选的 `workspaceId` 与 `projectKey` 仍写入 settings。离开 Agents 后保留，但不作用在列表上；回到 Agents 时恢复并重新作用（与 007 对 workspace 的约定相同，project 从「始终作用」改为同样只在 Agents 下作用）。
3. 这两行的计数只统计 agent：workspace chip 沿用按 `kind` 计数；project chip 在 Agents 下列出时同样只计 agent。

## 验收

- [ ] 全局页面在 All / Notes / Scratch 下不显示 workspace 与 project chip，列表不受上次的 workspace / project 选择影响。
- [ ] 选中 Agents 后两行出现（有对应 agent 时）；点选后离开再回到 Agents，选择仍在并重新筛选。
