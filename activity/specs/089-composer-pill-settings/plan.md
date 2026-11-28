# 089 — plan

## 数据

- `shared/activity-settings.ts`
  - `defineSettings({ id: "activity", scope: "host", version: 1 })`
  - `hideUsagePill: boolean = false`
  - `hideAttentionPill: boolean = false`
- `index.server.ts` 注册 `activitySettings`，由宿主持久化。

## 客户端状态

- `client/activity-settings-store.ts`：内存快照 + 订阅，供非 React 的 pill contribution 使用。
- `index.client.tsx`
  - 初始通过 `settingsRpc("activity").read` 读取并写入 store。
  - 监听 `status.plugin_settings_changed`，其他客户端或设置页保存后重新读取。
- `client/settings-screen.tsx`
  - `useSettings(activitySettings)` + `SettingsSwitch`。
  - ready 值同步到 store；保存后立即影响 pill。

## Pill 同步

- `client/pill.tsx`
  - `PillEntry` 记录 `agentId` / `workspaceId` 与可选 registration。
  - 设置隐藏时只移除 registration，保留目录条目；重新启用时重新注册并重新查询。
  - 隐藏期间不执行空态 recheck / revive。
- `client/attention-pill.tsx`
  - 同样保留目录条目，仅按设置增删 registration。
  - 重新启用时用缓存的 workspace attention 状态恢复 label / icon。

这样不用 `visible: false` 做长期隐藏：宿主会卸载隐藏 pill 的 icon，icon 内的查询/恢复逻辑也会停止，无法可靠响应“重新显示”。

## 验证

- `shared/activity-settings.test.ts`：默认值、两个开关独立、settings 比较。
- `npm run typecheck`
- `npm test`
- `paseo plugin reload activity` 后 `paseo plugin ls`
