# Inbox specs

| 编号 | 目录 | 主题 | 状态 |
|---|---|---|---|
| 001 | [`001-inbox-mvp`](./001-inbox-mvp/) | 收藏 agent（含归档 / 反归档）、notes、project 记录、临时记录；按 host 存储并可切换 host 查看 | 规划中 |
| 002 | [`002-workspace-inbox`](./002-workspace-inbox/) | Explorer 里的 workspace 级 Inbox；全局页面按 workspace 筛选；归档 workspace 的条目在全局页面隐藏 | 实现中 |
| 003 | [`003-item-sort`](./003-item-sort/) | 全局页面排序：收藏时间 / 创建时间 / 修改时间 / 名称 | 实现中 |
| 004 | [`004-slash-workspace-flag`](./004-slash-workspace-flag/) | `/inbox -w`：收藏 agent / 记 scratch 到当前 workspace | 实现中 |
| 005 | [`005-agent-status`](./005-agent-status/) | 收藏 agent 显示实时状态（Running / Finished / Needs permission 等）；归档隐藏 Open；按钮文案 | 实现中 |
| 006 | [`006-icon-buttons`](./006-icon-buttons/) | 新建笔记、Pin / Remove / Delete、Open / Unarchive、排序按钮改为纯图标 | 实现中 |
| 007 | [`007-agent-last-exchange`](./007-agent-last-exchange/) | 收藏 agent 详情展示最后一条用户 prompt 与 agent 回复 | 实现中 |
| 007 | [`007-persist-filters`](./007-persist-filters/) | 分组 / workspace / project 筛选与全局排序写入 host settings，重开后恢复 | 实现中 |
| 008 | [`008-filter-scope-icons`](./008-filter-scope-icons/) | workspace / project 筛选 chip 前用图标区分两条筛选栏 | 实现中 |
| 009 | [`009-explorer-toolbar`](./009-explorer-toolbar/) | Command Center 标题改为 Inbox；Explorer 笔记与收藏 agent 放到搜索框右侧，收藏为纯图标 | 实现中 |
| 010 | [`010-agents-scope-chips`](./010-agents-scope-chips/) | 全局页面的 workspace / project 筛选只在 Agents 分组下显示并生效 | 实现中 |
| 011 | [`011-workspace-header-button`](./011-workspace-header-button/) | 每个 workspace header 增加 Inbox 图标按钮，点击在 Explorer 打开 Workspace Inbox；面板挂载时隐藏 | 实现中 |
| 012 | [`012-tag-scoped-workspace-inbox`](./012-tag-scoped-workspace-inbox/) | 只有全局数据：note / scratch 可打 project / workspace 标签（校验一致），Workspace Inbox 按标签过滤；移除 `/inbox -w`；归档标签加删除线。取代 002 部分决策与 004 | 实现中 |
| 013 | [`013-note-scope-chips`](./013-note-scope-chips/) | 全局页面 Notes / Scratch 也显示 project / workspace 筛选；project 行放在 workspace 行上方。取代 010 | 实现中 |
| 014 | [`014-all-scope-chips`](./014-all-scope-chips/) | 全局页面 All 下也显示并应用 project / workspace 筛选；New note 清除筛选。取代 013 决策 1 | 实现中 |

规则同仓库根 `AGENTS.md`：先改 spec / plan 再改代码；每完成一个 task 在 `tasks.md` 勾选并写验证方式；新功能点新开编号目录。
