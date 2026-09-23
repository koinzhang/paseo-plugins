# 067 — Plan

## 注册

`client.addHeaderButton({ id: "workspace-activity", workspaceId, button })` 是按 workspace 注册的，需要跟随 workspace 目录：

- `client/header-button.ts`：`paseo.workspaces.list({ subscribe: {} })` 拥有一个目录订阅
  - `snapshot`（首次与重连）→ 分页读全量，按 id 集合增删注册
  - `workspace_update`：`upsert` → 注册；`remove` → 移除
  - 订阅失败 / 未建立时每 15s 重连或全量对账（与 `agent-directory.ts` 同策略）
- 按钮：icon-only（不设 `label`），`icon: "Activity"`，`title` = `commands.workspaceActivity`
- `onPress` → `client.openPanel("workspace-activity", { workspaceId, location: "explorer" })`
- 语言变化：遍历注册 `update({ title })`
- entry cleanup：释放订阅、清定时器、`remove()` 全部注册

## 可见性联动

宿主没有面板可见性 API，且隐藏的面板保持挂载、容器尺寸为 0（见 062），所以由面板自报：

- `client/panel-visibility.ts`：按 workspace 记录可见实例集合；`usePanelVisibilityReport(workspaceId)` 返回面板根 `onLayout`，宽高均 > 0 记为可见，0 尺寸 / 卸载 / 切 workspace 记为不可见；仅在可见性翻转时通知
- `header-button.ts`：注册时 `visible: !isPanelVisible(id)`；`watchPanelVisibility` → `update({ visible })`
- 局限：宿主若以非 0 尺寸方式遮挡面板（如 opacity / 覆盖层）则检测不到；窗口隐藏期间 `onLayout` 不触发，恢复后首帧更新

## 入口

`index.client.tsx` 调用 `contributeHeaderButtons(client)` 并在 cleanup 中停止。
