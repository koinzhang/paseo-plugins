# 019 Plan

> 当前范围由 `020-notes-only-row-actions` 更新：移除 scratch 与转换分支，列表增加 Pin / Delete，agent 增加 Open / Pin / Remove。

## 实现

1. 新增 `client/note-actions.ts`：用一个小接口隔离 composer，插入正文并 await `focus()`，错误原样交给 UI toast；不改变 prompt 其他部分，不引入 RPC。
2. 在 `InboxView` 读取 focused composer，把可选目标传给 note / scratch 的 `ItemRow` 和 `Detail`。在标题行末尾添加 Copy / Send 小图标，设置独立 `onPress` 与 disabled 状态。
3. `copyText(item.body)` 成功后才 toast Copied；发送调用上述动作，toast 明确文本已插入而非已发送。点击按钮不触发行选择。
4. 为动作写纯 TypeScript 测试：原始正文、调用顺序、当前 composer、错误透传；UI 状态使用现有静态 / 类型检查与真实交互验证。
5. 行尾操作使用独立的 `RowIconButton`，与带边框的工具栏 `Button` 分离。统一尺寸、间距、颜色与按压背景，避免用样式覆盖造成不可预测的外框。
6. 把 note / scratch 的编辑器 state 提升到 `Detail`，通过受控 `NoteEditor` 继续使用同一份 `latest` / saved / persist 逻辑。详情按钮复用动作，读取当前 `body`；不为操作创建额外 RPC 或保存。
7. `ItemRow` 使用 React Native `onHoverIn` / `onHoverOut` 驱动按钮显隐；隐藏时 `opacity: 0` 且 `pointerEvents: none`。Web / 桌面端统一 hover，iOS / Android 固定显示，与 Workspace 的 compact 布局无关。纯函数测试覆盖 Web 与 native、hover 和 busy 组合。
8. 普通 note 详情页使用 `NoteActionGroup`：外层一条边框，内部三个等尺寸 icon segment 与两条竖分隔线；不修改列表、agent 或 scratch Convert 的 `Button`。`NoteEditor` 用一个透明容器包裹 Title / body，仅横分隔线保留 border。

## 源码依据

- `packages/plugin/src/client/composer.tsx`：`useComposers({ focused: true })` 返回当前 focused running agent；`insertText` 不提交 prompt。
- `packages/app/src/plugins/composer-items/source.ts`：focused selector 跟随 workspace focused tab；host 不匹配时为空。
- `packages/app/src/composer/agent-composer/index.ts`：屏幕上在光标处插入，离屏时保存草稿；`focus` 揭示输入框。
- `public-docs/plugins/reference.md`：Copy and paste、Focus a composer、Reach a composer by reference。

## 验证

- `node --experimental-strip-types --test client/note-actions.test.ts`
- `npm run typecheck && npm test`
- `git diff --check -- inbox`
- 主流程 `paseo plugin reload inbox` 后，用截图对应 Workspace Inbox 的现有 note 实测复制与插入，确认原 prompt 保留且没有新 turn。
- 最新详情视觉由静态检查、纯函数样式测试与现有详情页 AX 结构验证；截图通道本轮超时，不伪称已获得新截图。桌面 hover 已由用户在此前实测确认。
