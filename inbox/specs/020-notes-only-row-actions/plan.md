# 020 Plan

## 数据与命令

- shared contracts 移除 scratch；`saveNote` 输入保留 id / title / body / 标签目标，不再传 kind。
- `InboxStore` NoteInput / updateNote 固定 note；`update` 仅修改 pinned。`migrate` 先将 scratch 更新为 note，并在临时旧库上验证。
- slash command 直接调用 saveNote；filter settings 版本升至 4，迁移为 kinds / panelKinds，旧 all / scratch 映射为两者全选。

## UI

- `RowIconButton` 增加可选 color，Copy / Send / Pin 使用 muted，Delete 使用 statusDanger。
- `ItemRow` 复用现有 RPC：Pin 调 `items.update`，Delete 调 `items.delete`，成功后失效整个 Inbox namespace；若删除的是当前详情项，关闭详情。失败 toast 并刷新，按钮 busy 时禁用。
- note 四个轻量行尾按钮以竖分隔线连接；agent 行用 Open / Unarchive / Pin / StarOff 三个按钮。Open / Unarchive 提取共享 hook 与按钮配置，列表和详情复用相同恢复、toast、禁用和刷新语义；删除仅移出收藏。
- 移除 Scratch chip、KIND_ICON scratch、NoteEditor kind 推导、updateItem kind 合约。
- 新增 `KindFilterMenu`，搜索栏右侧单按钮、列表后渲染的 backdrop / surface1 浮层；Agents / Notes 独立勾选并连续选择，写入 host-scoped filters。

## 验证

- 旧库 scratch 迁移、保留字段、note-only 创建 / 更新 / 过滤、设置迁移与 slash 文案测试。
- `npm run typecheck && npm test && git diff --check -- inbox`。
- `paseo plugin reload inbox` 后只读检查现有 UI，不执行删除或发送。
