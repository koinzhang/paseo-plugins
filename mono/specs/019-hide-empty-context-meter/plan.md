# 019 · Plan

宿主 `context-window-meter.tsx`：`percentage === null` 时 SVG 只有轨道圆，没有进度圆；有 token 时（含 0%）画出第二圆。圆环 testID 为 `context-window-meter`，包在 `message-input-root` 里，外层是 28×28 的 `contextWindowMeterSlot`。桌面端中间还有一层 HoverCard trigger，且 trigger 只有这一个子节点。按钮行 `rightButtonGroup` 还有语音和发送按钮。

空圆环不能靠一条嵌套 `:has()` 的 CSS 规则隐藏：Chrome 会把含有嵌套 `:has()` 的整条选择器丢掉，圆环因此仍显示。

`reconcile` 在 `hideEmptyContextMeter` 开启时给空圆环打上 `data-mono-empty-context`，并沿只有一个子元素的父节点向上打到 28px slot 为止。按钮行有多个子元素，停在那里。`LAYOUT_CSS` 把该属性设为 `display: none`。

判定：后代 `circle` 少于 2 枚（只有轨道圆）视为空；一枚都找不到时，再用 `aria-label` 对照宿主 `contextWindow.accessibilityNoData`。有进度圆（含 0%）不隐藏。设置缺字段时 schema 默认 `true`。
