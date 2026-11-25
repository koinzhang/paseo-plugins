# 036 Plan

1. 在 `client/inbox-surface.tsx` 为 compact 详情头部拆分导航行与标题行，非 compact 保留原结构。
2. 新增专用详情头部样式，不为对齐修改标签或编辑器 padding。
3. 完成类型检查、现有完整测试和 diff 检查，重载 Inbox 后读取实际 Workspace 详情界面。
