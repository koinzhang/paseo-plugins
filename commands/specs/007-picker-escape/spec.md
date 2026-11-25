# 007 Picker Escape handling

## 问题

桌面 picker 使用自绘 React Native `Modal`。菜单行的 `stopPropagation()` 发生在 React 事件阶段，而 Paseo 的 `agent-interrupt` 快捷键在 window capture 阶段读取 `Escape`。因此用户本意是关闭 picker，却同时中断正在运行的 agent。

## 目标

桌面 picker 打开时，`Escape` 只关闭 picker，不调用 Paseo 的全局 agent interrupt；picker 关闭后，Paseo 原有 `Escape` 停止 agent 行为保持不变。

## 方案

- 使用浏览器原生 Popover API 展示桌面菜单，采用 `popover="auto"` 的 Escape / 外部点击关闭行为。
- Popover 关闭的 `toggle` 事件同步清理插件 picker 状态并移除临时 pill，不能只让视觉层消失。
- Paseo 的 `keyBelongsToDomPopover` 已把打开的插件 Popover 排除在全局快捷键之外，这是公开宿主行为所依据的上游实现，不在插件内增加全局 capture listener。
- 不支持 Popover API 的旧宿主以菜单存活期间的 `window` 前置监听兜底，抢先消费一次 Escape 并关闭菜单；菜单卸载后立即清理。
- 桌面菜单打开前保存输入框焦点，关闭后恢复，使后续 Escape 仍按 Paseo 原逻辑处理。
- 保留菜单行现有键盘处理作为辅助；不全局屏蔽 Escape，不修改 Paseo 源码。
- compact / native 继续使用 host Modal sheet。

## 验收

- [x] 桌面 picker 打开期间显示为 `:popover-open`，Escape 后插件状态与临时 pill 被清理。
- [x] 不支持 Popover API 时前置消费 Escape、关闭菜单并恢复焦点，不导致菜单不可用（结构化 fake 单元测试；当前 Paseo 实测走原生 Popover）。
- [x] 菜单关闭后恢复正常焦点，下一次 Escape 不被插件截获。
- [x] 类型检查、完整单测和插件 reload 通过。
- [x] 真实 Paseo 中验证 Escape 关闭菜单且不取消运行中 turn。
