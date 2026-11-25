# 019 Tasks

- [x] 核对 0.17.4 copy / focused composer 源码与当前列表 / spec，先写 spec / plan / research。
- [x] 实现 note / scratch 行尾复制与发送按钮、disabled / toast 状态，保留行选择与 agent 行。
- [x] 根据 Workspace Inbox 截图优化行尾布局：透明轻量按钮、28×28 视觉点击区、4px 间距、8px hitSlop、柔和色 14px 图标与按压背景；重载后截图确认 compact 面板无外框、间距一致、标题与按钮不挤压。再次 typecheck / 70 项测试 / diff check 全部通过。
- [x] 在 note / scratch 详情页的 Pin 与 Delete 之间加入同行为 Copy / Send；使用当前编辑器正文并保留自动保存、agent 行与 scratch Convert 顺序。已实现并通过类型检查；GUI 实测按用户最新指示取消。
- [x] 用户截图确认此前 Workspace 强制 compact 导致桌面持续显示。改为按平台显隐：所有 Web / 桌面列表 hover 显示，iOS / Android 固定显示；采用 RN hover 事件，隐藏不命中、保留占位、操作中保持可见。typecheck / 72 项测试 / diff check 通过并已 reload；用户实测确认桌面 hover 生效。详情页 `Pin → Copy → Send → Delete` 同时已在实际界面确认。
- [x] 按用户截图优化详情页：普通 note 前三个操作共享外框与竖分隔线、Delete 独立；Title / 正文融合为无边框编辑区，以横分隔线分开。不改变搜索框、自动保存、agent / scratch 操作。typecheck / 74 项测试 / diff check 通过并已 reload；AX 确认按钮与编辑区结构，截图通道超时，未取得最终视觉截图。
- [x] 添加 composer 动作回归测试，验证正文、调用顺序、错误与不自动发送。
- [x] 在实际 SDK 0.17.4 下运行 typecheck、完整测试、diff 检查：`npm run typecheck` exit 0；`npm test` 70/70 通过；`git diff --check -- inbox` exit 0。
- [x] reload 后在 Workspace Inbox 实测：Copy 显示 Copied，剪贴板严格为 `1111`；Send 后 focused agent composer 的值为 `1111`，只显示待发送按钮，没有自动提交或产生新 turn。当前 composer 原为空，因此验证了空草稿保留；非空草稿由宿主 `insertText` 契约与动作测试覆盖。
