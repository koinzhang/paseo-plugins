# 026 Workspace surface transparency

## 目标

- 对齐 Activity 的 Explorer workspace 面板背景：不为插件内容额外套一层 `surface0`。

## 决策

1. `InboxView` 仅在 workspace panel 使用透明 screen 背景，沿用 Paseo Explorer 的 surface。
2. 全局 Inbox 继续使用 `theme.colors.surface0`；toolbar、输入框、菜单、选中项背景不变。
3. workspace unavailable 的备用提示也使用透明背景，避免与 Activity 面板不一致。

## 源码依据

- `activity/client/workspace/panel.tsx:345`：workspace Activity 的 `screen.backgroundColor = "transparent"`。
- `inbox/client/inbox-surface.tsx:137`：此前 workspace / global 共用 `surface0`，覆盖了 Explorer 背景。

## 验收

- workspace panel 不再写死白色或 surface0，和 Activity 使用相同透明 surface 策略。
- typecheck、完整测试、diff check 和 reload，不做界面测试。
