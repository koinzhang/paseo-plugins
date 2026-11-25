# 034 Plan

- 在 `client/inbox-surface.tsx` 复用 Activity Agents 搜索的交互结构：弹性搜索槽、`Animated.View`、延迟聚焦和 X 收起清空。
- 工具栏按钮复用现有无边框 `RowIconButton`，避免影响详情页使用的 `Button`。
- `client/kind-filter-menu.tsx` 仅移除触发器边框和 ChevronDown，保留 ListFilter 和菜单定位。
- 按 Activity `iconButton` / `headerActions` 的实际数值修正图标槽与内外间距，避免仅去边框但视觉节奏不一致。
- 运行类型检查、完整测试和插件 reload；不新增数据或 RPC。
