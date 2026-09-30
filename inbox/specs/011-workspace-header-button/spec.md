# 011 Workspace header 按钮

## 目标

每个 workspace 的 header 右侧增加一个 Inbox 图标按钮，点击在 Explorer 打开该 workspace 的 Inbox 面板。面板已打开时隐藏按钮。

## 已定决策

1. 按钮按 workspace 注册（`addHeaderButton`），跟随 workspace 目录：新建后出现，归档 / 移除后注销。`paseo plugin reload inbox` 的 cleanup 会卸掉全部注册，不会留下重复按钮。
2. 纯图标（不设 `label`），`icon: "Inbox"`，无障碍标题 / hover 为 `Inbox`。点击 `openPanel("workspace-inbox", { workspaceId, location: "explorer" })`。
3. 该 workspace 的 Inbox 面板挂载时隐藏按钮，即使切到 Explorer 其他 tab 或收起 Explorer；关闭面板后重新显示。宿主没有 Explorer tab 列表 API，所以由面板自报挂载状态。
4. 不改宿主已有按钮，不控制位置与 overflow。按钮上不显示计数。Inbox 没有 app 语言目录，标题固定为 `Inbox`。

## 非目标

- 不打开全局 Inbox 页面。
- 不在按钮上反映未读或条目数量。

## 验收

- [ ] 打开任一 workspace，header 右侧出现 Inbox 图标按钮；hover 为 `Inbox`。
- [ ] 点击后 Explorer 打开当前 workspace 的 Inbox 面板，按钮随即隐藏。
- [ ] 切到 Explorer 其他 tab 或收起 Explorer 后按钮保持隐藏；关闭面板后重新出现。
- [ ] 新建 workspace 后按钮出现；归档后注册被移除。
- [ ] `paseo plugin reload inbox` 后无重复按钮。
