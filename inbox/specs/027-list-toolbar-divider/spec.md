# 027 List toolbar divider

## 目标

- 移除搜索栏与 note / agent 列表之间的整条横向分隔线。

## 决策

1. 列表 toolbar 不再绘制 `borderBottom`。
2. 搜索输入框自身边框、列表 item 之间的内嵌分隔线、详情页分隔线均保持不变。
3. 不改变搜索栏留白、列表布局、筛选菜单和任何交互行为。

## 验收

- toolbar 无底部边框，列表首条 item 仍保留自己的内嵌分隔线。
- typecheck、完整测试、diff check 和插件 reload 通过；不做界面测试。
