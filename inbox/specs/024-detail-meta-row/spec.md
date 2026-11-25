# 024 Detail metadata action row

## 目标

- 详情页 Project、Workspace 与操作按钮放在同一行，按钮靠右。
- 不再让标签行与按钮行各占一行；标题保持单独一行和单行缩略。

## 决策

1. 标签 chips 为左侧可收缩区域，Project → Workspace 排列，文本过长时缩略，不挤压按钮。
2. 操作按钮保持原顺序、分隔线和业务状态，使用 flex-end 靠右。
3. TagEditor 的下拉选项仍在该 meta row 下方展开；标签编辑、归档删除线、无标签占位不变。
4. 标题不放入此行，保留返回、图标、名称和权限徽标的原有布局。

## 验收

- 一行内依次是 Project / Workspace / 操作按钮，操作按钮位于行右端。
- 标签不会换到按钮下方，按钮样式和标签交互不变。
- typecheck、完整测试、diff check 和 reload，不做界面测试。
