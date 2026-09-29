# Mono specs

| 编号 | 目录 | 主题 | 状态 |
|---|---|---|---|
| 001 | [`001-mono-theme`](./001-mono-theme/) | Mono Dark / Mono Light 主题（冷色纸感；配色由 011 改为 Neutral 灰阶） | 已实现，人工验收待完成 |
| 002 | [`002-compact-sidebar-nav`](./002-compact-sidebar-nav/) | Web 侧栏顶部导航改为仅图标横排（New workspace / History / Search / Schedules + 插件项） | 已实现，人工验收待完成 |
| 003 | [`003-hide-thinking`](./003-hide-thinking/) | 时间线隐藏 agent Thinking（官方 timeline transformer，全平台） | 已实现，人工验收待完成 |
| 004 | [`004-hide-composer-voice`](./004-hide-composer-voice/) | 隐藏 composer 听写 / 语音模式按钮 | 已实现，人工验收待完成 |
| 005 | [`005-voice-button-settings`](./005-voice-button-settings/) | Settings → Plugins → mono 设置页与开关（后续由 007–009 / 014 扩展） | 已实现，人工验收待完成 |
| 006 | [`006-model-visibility`](./006-model-visibility/) | Settings → Providers 每模型可见性开关，隐藏项退出 composer / 新建 agent 模型列表 | 已实现，人工验收待完成 |
| 007 | [`007-hide-dividers`](./007-hide-dividers/) | 隐藏侧栏 / Explorer / 分栏分割线（009 起并入单一开关） | 已实现，人工验收待完成 |
| 008 | [`008-hide-borders`](./008-hide-borders/) | 隐藏 composer / pill 边框，弹层保留细边框（009 起并入单一开关） | 已实现，人工验收待完成 |
| 009 | [`009-decouple-layout-from-theme`](./009-decouple-layout-from-theme/) | 布局调整与主题解耦：合并 007 / 008 为 Hide dividers and borders，全部开关独立于主题 | 已实现，人工验收待完成 |
| 010 | [`010-popover-border-opacity`](./010-popover-border-opacity/) | 非 Mono 主题下 combobox / menu 弹层边框透明度减半（修订 009） | 已实现，人工验收待完成 |
| 011 | [`011-neutral-palette`](./011-neutral-palette/) | Neutral 调色板：R=G=B 灰阶，语义色保留（修订 001） | 已实现，人工验收待完成 |
| 012 | [`012-empty-changes-toolbar`](./012-empty-changes-toolbar/) | Changes 空仓库工具栏无内容时收起 | 已实现，人工验收待完成 |
| 013 | [`013-changes-surface`](./013-changes-surface/) | Changes 工具栏透出 Explorer 底色，隐藏 host 设置提示 | 已实现 |
| 014 | [`014-composer-file-attachments`](./014-composer-file-attachments/) | Composer 文件附件：类型图标 + 文件名，悬停 / 点击显示路径，含 Optimize file attachments 开关 | 已实现 |
| 015 | [`015-model-picker-reconciliation`](./015-model-picker-reconciliation/) | 模型选择弹窗 DOM 更新收敛：多实例 / 多 host 不再冻结 | 已实现 |
| 016 | [`016-composer-attachment-sizing`](./016-composer-attachment-sizing/) | Composer 附件字号跟随输入文字，类型标记同步缩放 | 已实现，人工验收待完成 |

| 017 | [`017-model-switch-host-ownership`](./017-model-switch-host-ownership/) | Provider 模型开关按当前主机隔离，修复多实例覆盖与回调错配 | 已实现并验证 |

规则同仓库根 `AGENTS.md`：先改 spec / plan 再改代码；每完成一个 task 在 `tasks.md` 勾选并写验证方式；新功能点新开编号目录。
