# 020 Notes only and complete row actions

## 目标

- 取消 scratch 类型、筛选与 Convert to note；`/inbox <text>` 直接创建 note。
- 列表 note 行提供 `Pin → Copy → Send → Delete`，与详情页顺序一致；Delete 为 `statusDanger`，其余行尾按钮保持轻量透明样式。
- 列表 agent 行提供 `Open / Unarchive → Pin → Remove from Inbox`，与详情页语义一致；Remove from Inbox 不删除、不归档 agent。
- 原筛选行移到搜索栏右侧的单个 Filter 按钮，点击弹出 Agents / Notes 多选菜单。

## 已定决策

1. `ItemKind` 收敛为 `agent | note`，saveNote 不再需要 kind 参数；正文 / 标签 / 收藏 agent 行为保持。
2. `/inbox` 无参数仍收藏当前 agent，有参数直接保存 note 并关联当前 workspace 的 project，不发送给 agent。
3. 启动 SQLite 时把已有 `kind = 'scratch'` 更新为 `note`，保留 id、标题、正文、标签、pin 和时间；移除 schema 对 scratch 的写入许可。使用临时旧库验证迁移，不在真实数据上执行验收写入。
4. 全局 / 面板筛选持久化为 `kinds: ['agent','note']` 数组，默认全选；旧 all / scratch 映射为全选，旧单选映射为只选对应类型。允许都不选（空列表）。菜单连续多选，不因一次选择关闭。
5. note 列表操作顺序为 `Pin / Copy / Send / Delete`；agent 列表为 `Open / Unarchive / Pin / Remove from Inbox`。active agent 用现有 navigation 打开；archived 改为 Unarchive 并复用详情的恢复流程，missing 禁用 Open。Web / 桌面 hover 时显示，iOS / Android 固定显示，操作中保持可见。
6. 行尾按钮保持现有透明轻量样式，用分隔线连接，不增加独立边框；Delete 使用红色 Trash2。点击按钮不触发行选择。详情页与列表采用同样的 RowIconButton，所有相邻按钮（含 Delete 前后）均有分隔线。agent 的 Open / Unarchive 是首个操作，archived 时不提供 Open；missing 时仅 Pin / Remove。
7. Filter 菜单只提供 Agents / Notes，默认两者勾选，可独立切换并即时持久化；点击外部关闭。采用 Activity 的透明 backdrop、surface1 浮层和 hover 行反馈，不保留原筛选 chip 行。
8. 筛选触发器留在搜索栏，菜单与 backdrop 在列表之后渲染，zIndex 分别为 31 / 30；以 trigger 相对整个 list chrome 的 measureInWindow 定位。菜单不嵌在 toolbar stacking context 内，打开时禁止底层列表滚动与点击。
9. agent 详情的 Prompt / Agent 消息使用透明背景、无边框，保留文字、间距与可选中能力。

## 非目标

- 不修改归档恢复、project / workspace 标签、自动保存、订阅刷新、agent Open / Unarchive。
- 不删除旧 scratch 内容，不自动提交 composer，不新增确认弹窗。

## 验收

- 全部代码路径无 scratch 类型、筛选、转换或创建入口；`/inbox` 文本写入 kind note。
- 旧 scratch 临时库重开自动成为 note，数据字段不变，旧筛选设置安全回退。
- note 行四个操作顺序正确，Delete 红色；agent 行首个操作与详情一致：active 为 Open，archived 为 Unarchive，missing 禁用 Open；hover / mobile 显隐不变。
- 搜索栏右侧 Filter 打开菜单，Agents / Notes 可分别切换，默认全选且旧设置迁移正确，原独立筛选行与 Scratch 消失。
- note / agent 详情按钮和列表同为无边框分隔线样式，agent 消息无边框，筛选浮层不穿透列表。
- 列表 Pin 更新排序并失效刷新，Delete 删除后关闭已打开的详情；失败 toast 并重新查询，保持原选中状态。
- typecheck、完整测试、diff check 通过，reload 后确认现有列表与详情。
