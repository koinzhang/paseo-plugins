# 013 — Pill popover 双层幽灵层（宿主缺陷，已回滚）

> **结论：判定为 Paseo 0.8.0 宿主缺陷，插件侧不绕行。**
> pill 保持 `behavior: { kind: "popover", Content: UsagePopover }`，等上游修复。
> 本目录只作排查记录，不再产出代码改动。

## 现象

点击 composer pill 后同时出现**两个**浮层：一个正确锚定在 pill 上，另一个被钉在屏幕**左上角**
（锚点测量退化为 0,0）。agent 正在输出时更易复现。

## 成因（宿主侧）

`kind: "popover"` 的浮层由宿主锚定，并挂在 **composer 子树**下。agent 流式消息会让宿主重渲染
composer，宿主会重挂已打开的浮层；旧层未被正确卸掉即成为幽灵层。

同一问题在生态里有独立记录：`paseo-plugin-helper` 将 `presentation: "popover"` 注明为
「宿主可能在每次 composer 重渲染时重挂该子树，可能撕掉已打开的浮层」，并另提供 `"centered"` 方案规避。
即浮层的生命周期归宿主的 composer 子树，插件无法可靠干预。

## 试过且无效 / 不可接受的方案

| 方案 | 结果 |
|---|---|
| 打开期间冻结 `pill.update`（sticky open + close grace 300ms） | 仍复现 |
| 渲染期 `armPopoverOpen` 抢在 icon effect 前上锁 | 仍复现 |
| descriptor 写入延迟 48ms、open 时取消；close grace 提到 500ms | 仍复现 |
| 改 `action` + 由常挂 icon 渲染宿主 `Modal`（生态推荐的 `centered` 等价方案） | **能消除幽灵层**，但呈现变成居中对话框 + 全屏遮罩，交互上不可接受 |

## 决定

回滚到宿主 popover，删除上述全部绕行代码（`client/popover-gate.ts`、`client/pill-modal-store.ts`
及其单测）。pill 代码保持「注册一次 + label 变化时 `pill.update`」的朴素形态。

## 若上游修复后需要复核

- 宿主版本：`paseo --version` = `0.8.0`（复现版本）
- 复现路径：agent 持续输出时点击 pill
- 期望：只出现一个锚定浮层，无左上角残留
