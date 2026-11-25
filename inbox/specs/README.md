# Inbox specs

> 020 起取消 scratch，统一为 note；旧规格中的 scratch 描述仅作历史记录。

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
| 015 | [`015-chip-wheel-scroll`](./015-chip-wheel-scroll/) | web 上鼠标滚轮可横向滚动 project / workspace chip 行，到头后不拦截 | 实现中 |
| 016 | [`016-agent-title-sync`](./016-agent-title-sync/) | 收藏 agent 改名后，列表 / 搜索 / 名称排序跟随最新名称 | 实现中 |
| 017 | [`017-paseo-0.17-audit`](./017-paseo-0.17-audit/) | Paseo 0.17.4 / 插件 SDK 源码审查；保留实现，记录订阅、实体缓存与恢复接口的取舍 | 审查完成，完整测试通过；真实归档恢复未执行 |
| 018 | [`018-paseo-0.17-alignment`](./018-paseo-0.17-alignment/) | 实际安装 SDK / client / protocol 0.17.4；服务端写入失效订阅、重连刷新和兼容 API 清理，取代 017 的暂缓升级决定 | 实现完成，typecheck / 67 项测试通过；真实跨客户端重连与恢复待上级验收 |
| 019 | [`019-note-copy-composer`](./019-note-copy-composer/) | note / scratch 行尾复制正文、插入当前 focused agent 的 composer；不自动发送 | 已实现，平台 hover 与详情分段按钮 / 无边框编辑区，完整测试通过 |
| 020 | [`020-notes-only-row-actions`](./020-notes-only-row-actions/) | 移除 scratch，`/inbox` 直接保存 note；列表 Pin / Copy / Send / Delete | 实现中 |
| 021 | [`021-detail-and-workspace-subtitles`](./021-detail-and-workspace-subtitles/) | 详情单行标题、无边框分隔按钮、Agent Markdown；workspace 副标题时间与 star 回退 | 实现完成，离线检查通过；未做界面测试 |
| 022 | [`022-note-content-time`](./022-note-content-time/) | note 只有标题 / 正文实际变更才更新时间；New note 普通图标按钮 | 实现完成，81 项测试通过；未做界面测试 |
| 023 | [`023-stable-row-hover`](./023-stable-row-hover/) | 桌面列表 hover 不因按钮 disabled 变化而闪动 | 实现完成，离线检查通过；实际 hover 待用户验证 |
| 024 | [`024-detail-meta-row`](./024-detail-meta-row/) | 详情 Project / Workspace 与操作按钮同一行，按钮靠右 | 实现中 |
| 025 | [`025-global-scope-row`](./025-global-scope-row/) | 全局 Project / Workspace 筛选并入搜索栏 Filter 菜单 | 实现中 |
| 026 | [`026-workspace-surface`](./026-workspace-surface/) | workspace Explorer 按 Activity 使用透明背景，global 保持 surface0 | 实现中 |
| 024 | [`024-single-document-note-icons`](./024-single-document-note-icons/) | 笔记采用单页文档图标，新建采用文档新增图标 | 实现完成，81 项测试通过；未做界面测试 |
| 026 | [`026-workspace-panel-icon`](./026-workspace-panel-icon/) | Workspace 使用工作面板图标，不再使用 Git 分支 | 实现完成，离线检查通过；未做界面测试 |
| 027 | [`027-list-toolbar-divider`](./027-list-toolbar-divider/) | 移除搜索栏与列表之间的横向分隔线 | 实现完成，离线检查通过；未做界面测试 |
| 028 | [`028-hover-title-width`](./028-hover-title-width/) | 桌面隐藏操作不占位；hover 后按按钮宽度缩略标题，移动端不变 | 实现完成，离线检查通过；未做界面测试 |
| 029 | [`029-list-resizer-hit-area`](./029-list-resizer-hit-area/) | 恢复全局列表定宽及分隔线拖拽，不被溢出列表命中区覆盖 | 实现完成，离线检查通过；未做界面测试 |
| 030 | [`030-initial-first-selection`](./030-initial-first-selection/) | 全局首次进入且无选择时打开列表第一项 | 实现完成，84 项测试通过；未做界面测试 |
| 031 | [`031-multi-scope-filters`](./031-multi-scope-filters/) | 全局 Project / Workspace 多选、无 All | 实现完成，默认选择见 035，无标签保留见 033 |
| 032 | [`032-default-all-scopes`](./032-default-all-scopes/) | 默认勾选所有 Project / Workspace | 已由 035 回滚 |
| 033 | [`033-untagged-scope-visibility`](./033-untagged-scope-visibility/) | 有选中标签时，无对应标签的条目仍可见 | 实现完成，空选语义由 035 恢复为不过滤 |
| 034 | [`034-collapsible-list-search`](./034-collapsible-list-search/) | 列表工具栏图标去边框；搜索改为图标点击展开，参考 Activity Agents | 实现完成，89 项测试通过；全局默认样式实机确认，展开及 Workspace 交互待验收 |
| 035 | [`035-default-unselected-scopes`](./035-default-unselected-scopes/) | Project / Workspace 默认不选中，选中才过滤；回滚 032 | 实现完成，89 项测试通过、插件 running；实机菜单待确认 |

规则同仓库根 `AGENTS.md`：先改 spec / plan 再改代码；每完成一个 task 在 `tasks.md` 勾选并写验证方式；新功能点新开编号目录。
