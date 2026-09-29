# 006 图标按钮

## 目标

精简 Inbox 按钮：以下按钮只显示图标、不显示文字，文字保留为无障碍标签（`accessibilityLabel`）。

## 已定决策

1. **新建笔记**：原「+ Note」改为 `NotebookPen` 图标（全局页面与 Explorer 面板一致），标签 `New note`。
2. **详情操作**：
   - Pin / Unpin：`Pin` / `PinOff`，标签 `Pin` / `Unpin`。
   - Remove（agent 条目，移出 Inbox = 取消收藏）：`StarOff`，标签 `Remove from Inbox`。
   - Delete（note / scratch，永久删除）：`Trash2`，标签 `Delete`；仍为 danger 样式。
   - Open（跳到该 agent）：`SquareArrowOutUpRight`，标签 `Open`。不用 `ArrowUpRight`（更像趋势或外链箭头）。
   - Unarchive：`ArchiveRestore`，标签 `Unarchive`；进行中为 `Unarchiving`，按钮禁用。
   - `Convert to note` 保持图标 + 文字。
   - agent 条目的 Open / Unarchive 与 Pin / Remove 同一行，排在最前面（原先在详情字段下方单独一行）。
3. **排序按钮**（覆盖 003 决策 4 中「按钮显示当前排序名」）：只显示当前排序对应的图标，点击循环切换顺序不变；标签 `Sort: <名称>`。
   - Updated：`ClockArrowDown`
   - Starred：`Star`
   - Created：`CalendarPlus`
   - Name：`ArrowDownAZ`
4. 图标名已在 Paseo app 依赖的 `lucide-react-native@0.546.0` 中确认存在。

## 验收

- [ ] 全局页面搜索框右侧为笔记图标与排序图标，无文字；Explorer 面板的新建笔记按钮同样为图标。
- [ ] 详情页 Pin / Remove / Delete / Open / Unarchive 为图标按钮；agent 条目显示 `StarOff`，note / scratch 显示 `Trash2`；Open 为 `SquareArrowOutUpRight`，Unarchive 为 `ArchiveRestore`。
- [ ] 每次点击排序按钮图标随排序方式切换（Updated → Starred → Created → Name）。
