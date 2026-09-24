# 002 · Web 侧栏快捷导航

## 目标

- Web / Electron 下，选中 Mono Light 或 Mono Dark 时，把宿主侧栏顶部导航组改为仅图标的横向排列（放不下时自动换行）
- 覆盖内置四项 New workspace、History、Search、Schedules，以及任意插件通过 `addSidebarItem` 加入同一组的项
- 按 DOM 顺序排列，遵循用户在 Settings → Appearance 中调整的顺序与显隐
- 隐藏文字后以原生 `aria-label` 作为 hover tooltip（`title`）
- 按钮尺寸对齐 Explorer 的 Files / Changes 标签：高 26px、左右内边距 8px、圆角 6px、间距 4px、距边缘 6px
- 宽度 ≥ 720px（Unistyles `md`）时，导航组最小高度 36px（`HEADER_INNER_HEIGHT`，含底边框）、去掉上下内边距并垂直居中，使底边框与中间栏顶栏对齐；换行时随内容增高
- 保留宿主原生按钮、图标、点击行为、hover / active 状态和 accessibility label
- 使用 Paseo 0.9.x 的稳定 `data-testid` 定位，不依赖界面语言或可见文案
- 插件停用、切换非 Mono 主题或 React 重建节点时，完整恢复宿主布局

## 定位

- 内置项：`sidebar-global-new-workspace`、`sidebar-sessions`、`sidebar-search`、`sidebar-schedules`
- 插件项：`plugin-sidebar-<pluginId>-<contributionId>`（`packages/app/src/plugins/sidebar-items.tsx`）
- 两者都渲染为 `SidebarHeaderRow variant="compact"`，同为 `SidebarNavRows` 容器的直接子项
- 可见项少于 2 个时不改写（无法可靠确认容器）

## 非目标

- 不支持 iOS / Android；原生端仅保留 Mono 配色
- 不移动或克隆宿主节点

## 风险

- 这是非官方 DOM 适配层；Paseo 若修改测试标识或侧栏结构，需要同步适配
- CSS 仅在 `@paseo:app-settings` 选中的插件主题 ID 以 `/theme/mono-light` 或 `/theme/mono-dark` 结尾时生效

## 验收

- `npm run typecheck`、`npm test` 通过
- `paseo plugin reload mono` 后状态为 `running`
- Mono 主题下内置项与插件项（如 Activity）横向排列且只显示图标；hover 显示名称；各按钮仍可点击
- 在 Settings 调整导航顺序 / 隐藏某项后，横排随之变化
- 切换非 Mono 主题或停用插件后恢复纵向文字布局

## 分割线

- 左侧栏顶部 / 底部分割线移除见 `specs/007-hide-dividers/`

## 设置

- 可在 Settings → Plugins → mono → Settings 关闭（默认开启），见 `specs/005-voice-button-settings/`

## 与主题解耦

- 自 009 起不再要求选中 Mono 主题，由设置页开关控制，见 `specs/009-decouple-layout-from-theme/`
