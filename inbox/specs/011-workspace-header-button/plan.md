# 011 — Plan

对照 Activity `067-workspace-header-button`。

## 注册

`client.addHeaderButton({ id: "workspace-inbox", workspaceId, button })` 按 workspace 注册，跟随 workspace 目录：

- `client/header-button.ts`：`paseo.workspaces.list({ subscribe: {} })` 拥有一个目录订阅
  - `snapshot`（首次与重连）→ 分页读全量，按 id 集合增删注册
  - `workspace_update`：`upsert` → 注册；`remove` → 移除
  - 订阅失败 / 未建立时每 15s 重连或全量对账
- 按钮：icon-only，`icon: "Inbox"`，`title: "Inbox"`
- `onPress` → `client.openPanel("workspace-inbox", { workspaceId, location: "explorer" })`
- entry cleanup：释放订阅、清定时器、`remove()` 全部注册

## 面板打开状态联动

宿主没有向插件暴露 Explorer 的 tab 列表。面板切走或 Explorer 收起时通常仍保持挂载，因此由面板自报挂载状态：

- `client/panel-visibility.ts`：按 workspace 记录挂载实例集合；`usePanelPresenceReport(workspaceId)` 在 effect 中登记，卸载 / 切 workspace 时清理；仅在有无实例变化时通知
- `header-button.ts`：注册时 `visible: !isPanelMounted(id)`；`watchPanelPresence` → `update({ visible })`
- 局限：宿主 `WorkspacePanelHost` 的 `useMountedTabSet` cap 为 3。打开更多 tab 后，Inbox 即使仍在 Explorer 的 tab 列表中也可能被卸载；没有宿主 tab 状态 API 时，插件不能精确区分这种卸载和关闭面板（`../paseo/packages/app/src/screens/workspace/workspace-panel-host.tsx`）

## 入口

`index.client.tsx` 调用 `contributeHeaderButtons(client)`，cleanup 时停止。`WorkspaceInboxPanel` 挂载时调用 `usePanelPresenceReport`。
