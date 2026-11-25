# Research

版本锚点：Paseo `1ff119dc2a42825e7fdc46c504b6ccee52a4f8be`（0.17.4）。

## 根因

- `packages/app/src/keyboard/keyboard-shortcuts.ts` 的 `agent-interrupt` 默认绑定 `Escape`，作用于 message-input / other。
- `packages/app/src/keyboard/internal/sources/dom.web.ts` 在 window capture 阶段处理快捷键，因此 picker 行内的 React `stopPropagation()` 太晚，不能阻止它。
- Paseo 的 `packages/app/src/keyboard/internal/dom-popover.web.ts` 专门说明插件不能注册 app overlay registry，而应使用 Popover API；`keyBelongsToDomPopover` 在存在 `:popover-open` 时让 Escape 不进入全局快捷键。
- 同文件的 `overlay-root.browser.test.tsx` 已验证打开插件 Popover 时 Escape 属于面板，其他按键仍走全局快捷键。

## 关闭同步

- 原生 `popover="auto"` 支持 Escape 和外部点击关闭。插件必须监听 `toggle`，在 `newState === "closed"` 时删除 picker 状态和临时 pill。
- 仅依赖菜单行 `onKeyDown` 不足以覆盖 Popover 自己消费 Escape 的路径；仅依赖宿主按钮的开关也无法通知插件清理状态。
- 不支持 `showPopover()` 的环境返回空 cleanup，保留现有 React Native Modal 和菜单关闭逻辑。
- Popover 的 light-dismiss 可能恢复打开前的焦点；显式 `state.close()` 与旧宿主兜底也需要恢复同一焦点，否则焦点落在 `body` 时下一次 Escape 仍会命中 `agent-interrupt`（默认 `focusScope` 包含 `other`，见 `packages/app/src/keyboard/keyboard-shortcuts.ts:1247`）。

## 真实浏览器验收（2026-11-25）

- 在 Paseo 官方 Web 界面连接本机 daemon，隔离 Agent `2cce5163-2ac1-4148-95c1-ad4447fc1d13` 执行 `sleep 45`。
- `/effort`、`/model`、`/mode` 依次只打开菜单：打开时 `:popover-open` 数量为 1；按一次 Escape 后为 0，临时 pill 消失，焦点回到 `TEXTAREA`。
- 每次 Escape 后 `paseo agent inspect` 均为 `running`；`paseo wait` 最终为 `idle`，sleep 任务完成并输出 `done`，没有取消或中断日志。
- 当前宿主实测使用原生 Popover；旧宿主的前置监听只由结构化 fake 单元测试覆盖。
