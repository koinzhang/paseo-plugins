# 019 · Research

- 上游源码锚点：`718ed932b7843cde0b156ff30ec6adf42e828a18`（paseo 0.11.1 · main · 2026-10-09）
- 运行时：`paseo --version` = 0.11.1；`requirements.paseo` = >=0.9.0
- `packages/app/src/components/context-window-meter.tsx`：`getUsagePercentage` 在 max/used 无效时返回 `null`，进度圆不渲染。无数据时 `accessibilityLabel` 为 `contextWindow.accessibilityNoData`（英文 “Context window: No context data”）。详情文案 `contextWindow.noData` 为 “No context data”。
- `packages/app/src/composer/index.tsx`：`hasAgent` 时渲染 `contextWindowMeterSlot`（28×28）。`packages/app/src/composer/input/input.tsx` 把它放在 `message-input-root` 的 `rightButtonGroup` 里，与语音按钮、主操作按钮并列。
- `packages/app/src/components/ui/hover-card.tsx`：桌面 trigger 是圆环的父 View；弹出层走 Portal，不占按钮行的子节点。
