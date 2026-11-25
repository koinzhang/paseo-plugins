# 026 Workspace panel icon

## 目标

- Workspace 不再使用容易误解为 Git 分支的 `GitBranch`。
- Project 与 Workspace 使用不同、直观的标签图标。

## 决策

1. 全局 Workspace 筛选和详情 Workspace 标签统一使用 `PanelsTopLeft`，表达独立工作面板。
2. Project 保留 `Folder`；归档删除线、标签编辑、筛选和布局不变。
3. 使用 Paseo 官方插件示例已有的 Lucide 图标，不增加自定义 SVG 或依赖。

## 验收

- 两处 Workspace 标签不再使用 `GitBranch`。
- typecheck、完整测试、diff check 和插件 reload 通过；不做界面测试。
