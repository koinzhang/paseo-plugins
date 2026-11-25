# 021 Detail and workspace subtitles

## 目标

- agent / note 详情按钮与列表一致：无边框，相邻按钮（含删除）均有分隔线；标题单行缩略。
- Agent 消息使用 SDK `Markdown`，移除独立边框；保留宿主的主题、文本选择和链接行为。
- workspace Inbox 的 note 副标题只显示编辑时间和日期，不再重复 project / workspace。
- workspace Inbox 的 agent 副标题显示实际 provider（如 codex / claude）与最近活动时间；快照没有活动时间时显示 star 时间。
- 列表条目之间的分隔线使用与详情 Title / Content 相同的左右留白，不贴到面板两侧。

## 边界

- 全局列表继续保留 project / workspace 标签、provider 与日期，不跟随 workspace 简化。
- 使用现有 10 秒 agent 状态查询提供活动时间，不为副标题新增 agent 请求或改变 SQLite 收藏时间。
- 只改 `inbox/`，不操作真实笔记、agent 或 composer，不执行界面自动化。

## 验收

- 详情标题 `numberOfLines=1`，详情操作使用列表的 `RowIconButton` 和 `itemActionDivider`。
- Agent 消息由 `@getpaseo/plugin/client/ui` 的 `Markdown` 渲染，没有外框。
- 移除 item 的全宽 borderBottom，改由独立 `itemDivider` 绘制；左右留白与 item 水平 padding 一致。
- workspace note 副标题为 `HH:mm:ss · YYYY/M/D`，不加 edited 前缀；agent 为 `provider · HH:mm:ss · YYYY/M/D`，没有活动快照时以 `provider · starred HH:mm:ss · YYYY/M/D` 标识回退。
- typecheck、完整测试、diff check 通过，重载后由用户查看实际界面。
