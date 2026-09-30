# 009 Explorer 工具栏与 Command Center 标题

## 目标

Command Center 里打开 Inbox 的条目标题改为 `Inbox`。Explorer 面板把新建笔记和收藏 agent 放到搜索框右侧，收藏 agent 只显示图标。

## 已定决策

1. Command Center 全局条目标题由 `Open Inbox` 改为 `Inbox`，图标仍是 `Inbox`。关键字加上 `open`，搜索 “open inbox” 仍能命中。
2. Explorer 面板的新建笔记（`NotebookPen`，主按钮）和收藏 agent 与搜索框同一行，靠右排列，和全局页面搜索框右侧的按钮一致。不再单独占一行。
3. 收藏 agent 改为纯图标按钮（覆盖 002 的「+ Agent」文案）：
   - 未展开：`Star`，标签 `Add agent`。`UserPlus` 像加人、`BookmarkPlus` 按反馈也不合适，改回星星。
   - 展开候选列表时：`X`，标签 `Done`。
4. 全局页面的搜索行不变：笔记图标和排序图标。

## 验收

- [ ] ⌘K 中该条目显示为 `Inbox`。
- [ ] Explorer 面板搜索框右侧为笔记图标和加入 agent 图标，没有 “Agent” / “Done” 文字；加入 agent 为星星图标。
- [ ] 点加入 agent 图标展开候选列表，按钮变为关闭图标；再点或收藏后收起。
