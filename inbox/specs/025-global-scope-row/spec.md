# 025 Global scope chips row

## 目标

- 全局 Project 和 Workspace 筛选收进搜索栏右侧的筛选菜单，与 Agents / Notes 共用入口，不再显示 chips 行。

## 决策

1. 菜单分为 Types / Projects / Workspaces 三组，使用同一弹层和分隔线。
2. Agents / Notes 保持多选；031 起 Project / Workspace 同样多选，取消全部勾选表示不按该维度过滤。
3. Project / Workspace 保留计数、归档删除线和标签，选中显示 Check；无标签时只显示 Types。
4. workspace Explorer 只显示 Types，不显示全局 scope 选项；详情页布局不变。
5. 后续 029 修正菜单接入时分栏样式冲突：保留菜单相对列表 chrome 的定位，但不能令列表 flex 扩张或以 overflow visible 覆盖分隔线。

## 验收

- 搜索栏右侧 Filter 弹层可选择 Type / Project / Workspace，列表下方无 chips 行，原持久化与过滤行为不变。
- typecheck、完整测试、diff check 和 reload，不做界面测试。
