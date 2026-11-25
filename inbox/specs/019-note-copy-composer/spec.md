# 019 Note copy and composer insertion

> 当前范围由 `020-notes-only-row-actions` 更新：scratch 已移除，以下 note / scratch 统一指 note。

## 目标

在 Inbox 列表的每条 note / scratch 右侧，以及 note / scratch 详情页的 Pin 与 Delete 按钮之间，增加两个独立图标按钮：

- Copy：复制该条目的正文 `body`，不拼接标题、标签或其他元数据。
- Send to current agent：把同一正文写入当前打开 agent 的 composer 输入框。

## 已定决策

1. 使用 SDK 0.17.4 的 `copyText` 与 `useComposers({ focused: true })`，不使用浏览器 DOM clipboard 或 agent timeline / prompt 发送接口。
2. 正文原样保留，包括 Markdown 与换行；composer 已有文字不替换，使用 `insertText` 按宿主规则在光标处插入，输入框不在屏幕上时追加到保存的草稿。
3. 插入后调用 `focus()` 返回并聚焦该 agent 的 composer。功能不会自动发送 prompt、创建 turn、修改 note 或写入 Inbox 数据。
4. 全局 Inbox screen 没有 focused agent 时发送按钮禁用；workspace Explorer 面板按宿主 focused agent 解析，目标必须属于当前面板 host。按钮不改变当前选择，点击行其他区域仍打开详情。
5. 使用 `Copy` / `Send` 图标及明确的英文无障碍标签。复制、插入或聚焦失败显示 toast；按钮操作期间禁用，避免重复点击。
6. 行尾按钮采用轻量透明样式，不沿用工具栏的边框按钮：固定 28×28 视觉点击区、4px 图标间距、8px hitSlop、14px 柔和色图标。按钮组不压缩、不环绕，标题保持弹性并单行截断；按压时仅用 `surface2` 背景反馈，不改变行高。
7. 详情页操作顺序固定为 `Pin → Copy → Send → Delete`。前三个操作合并为一个圆角外框的分段按钮组，组内用竖分隔线隔开，单个按钮不再分别描边；Delete 保留独立的危险色边框。Copy / Send 使用编辑器当前显示的正文，包括尚未经过自动保存的修改；新草稿没有内容时不显示操作按钮。
8. 列表按平台区分：Web / 桌面端仅在鼠标移入该条目时显示操作按钮，iOS / Android 固定显示。Workspace 面板强制 compact 只影响布局，不再影响按钮显隐。Web 隐藏时保留占位、透明且不可鼠标命中，不让标题或行高抖动；复制 / 插入进行中保持可见。详情页按钮不受 hover 规则影响。
9. note / scratch 的 Title 与正文属于同一个无外框、透明背景的编辑容器，Title 与正文之间仅保留一条横分隔线。移除两个输入框各自的边框、背景和圆角，保留输入内边距、正文自适应高度与保存状态；搜索框样式不变。

## 非目标

- 不在 agent 条目上添加这两个按钮，不复制标题或标签。
- 不自动提交、不发送给后台 agent、不允许跨 host 选择目标。
- 不改变现有 notes 编辑器的编辑、自动保存、订阅失效、标签、归档或排序行为。

## 验收

- 每条 note / scratch 都有复制与发送按钮，agent 行没有。Web / 桌面端默认隐藏、hover 显示，iOS / Android 固定显示。
- note / scratch 详情页在 Pin 与 Delete 之间显示 Copy / Send，agent 详情页没有这两个按钮；scratch 原位置保持 `Pin → Convert to note → Copy → Send → Delete`。
- 普通 note 的 Pin / Copy / Send 只有一个共享外框与两条竖分隔线，Delete 独立；Title / 正文无外框，中间只有一条横分隔线。
- 复制内容严格等于正文，成功后才显示 Copied，失败显示错误。
- 详情页复制和发送读取编辑器当前正文，未保存修改也能立即复制 / 插入，且不会因此提前保存或删除笔记。
- 发送调用当前 focused composer 的 `insertText(body)` 和 `focus()`，不调用 `setPrompt`，不自动发送；无目标时禁用。
- 当前 composer 切换后按钮使用新目标；发送期间不重复写入。
- 0.17.4 下 typecheck、完整测试和 diff 检查通过；reload 后在 Workspace Inbox 实际验证两个按钮。
