# 005 · 显示设置

## 目标

- 新增 Settings → Plugins → mono → **Settings** 设置页，四个开关，默认全部开启（与 002–004 现有行为一致）：
  - **Layout**
    - Compact sidebar navigation：左上角导航简化为横排图标（002）
    - Hide Thinking in timeline：时间线隐藏 Thinking（003）
  - **Voice buttons**
    - Hide dictation button：听写（Lucide `Mic`，004）
    - Hide voice mode button：语音模式（Lucide `AudioLines`，004）

## 设计

- 使用官方 settings API：`shared/settings.ts` 用 `defineSettings` 定义文档 `display`（`scope: "host"`, `version: 1`），字段带默认值，`{}` 解析为全部 `true`
- `index.server.ts` 调用 `server.registerSettings`，负责持久化（宿主 JSON，同一 host 的客户端共享）
- 设置页 `client/settings-screen.tsx` 用 `useSettings` + `@getpaseo/plugin/client/ui` 的 `SettingsSwitch`，切换即保存
- 客户端设置 store（`client/settings-store.ts`）：
  - 启动时通过 `client.rpc(settingsRpc("display").read)` 读取一次，失败或 invalid 时保持默认
  - 设置页拿到 ready 值时写入 store
- 订阅者：
  - Thinking：按 `hideThinking` 注册 / 移除 timeline transformer；宿主在注册变化时发布新 registry 快照，时间线重新投影，无需重载
  - 侧栏：`reconcile` 在 `compactSidebarNav` 关闭时只保留主题标记，不标记导航分组
  - 语音按钮：独立 `<style>`，只包含开启隐藏的选择器；仍需 Mono 主题（`html[data-mono-theme]`）

## 非目标

- 不做跨客户端实时同步：其他客户端修改后，本客户端需打开设置页或重载插件才生效
- 侧栏与语音按钮在 iOS / Android 不生效（同 002 / 004）

## 验收

- `npm run typecheck`、`npm test` 通过
- `paseo plugin reload mono` 后状态为 `running`
- 设置页 Layout 在 Voice buttons 上方，四个开关默认开启
- 每个开关关闭后对应行为立即恢复宿主默认，其余不受影响
- 重载插件后设置保持
