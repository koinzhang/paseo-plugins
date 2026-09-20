# 055 — 创建直方图日柱改为整块渐变

- 状态：已实现（柱填色由 [057](../057-creations-accent-bars/) 取代为 accent 强度；整柱形状仍有效）
- 日期：2026-09-20
- 依赖：051（provider 明细与配色）、053（柱顶圆角）
- 修订：051 §4.2 / 053 G3 的「按段堆叠色块」以本目录为准；**G2 / §4 渐变填色** 以 [057](../057-creations-accent-bars/) 为准

## 1. 背景

051 把每日柱按 provider 堆成明显色块；即使 053 去掉接缝圆角，段与段仍是硬边界，读起来像多根胶囊叠在一起，而不是「这一天」。用户希望**每天一根整柱**，用当天出现过的 provider 颜色做软渐变。

## 2. 目标

| ID | 目标 |
|---|---|
| G1 | 有创建的日柱改为**单块** View：高度按当日总量，顶角 3px 圆角，底角直角 |
| G2 | 填充为 `to bottom` 软渐变：色序沿用 `stackCreationProviders`（顶→底）；**占比 &lt; 15% 且非当日最大的切片不进渐变**（避免 OpenCode=1 这类中间薄带把大色块切开）；存活色均匀过渡（不按 count 加权停点）；至多 3 色；单色日 / 过滤后仅 1 色 → 纯色 |
| G3 | 空槽（当日 0）仍为 2px `surface2`、无圆角 |
| G4 | 无障碍标签、窗口排名与配色规则不变（051）；浮层行经 [056](../056-creations-tooltip-nonzero/) 只列当日非零 |

## 3. 非目标

- 不改 `usage.agent-creations` 契约与分桶 / 排名纯函数
- 不引入第三方渐变库（用 RN `experimental_backgroundImage` / web `backgroundImage`）
- 不恢复硬堆叠色块作为可选项

## 4. 行为

- 柱高：`max(2, round(bucket.count / 窗口峰值 * 图高))`（按日总量，不再按段累加）
- 多 provider：先 `significantCreationSlices`（保留当日 peak；丢弃 `count/total < 0.15`；至多 3 色、保持原顶→底序），再 `linear-gradient(to bottom, c0, c1, …)` **均匀**过渡；过滤后只剩 1 色则纯色
- 浮层仍列出当日全部 provider（含被渐变折叠的薄切片）
- 单 provider：`backgroundColor` 纯色，无渐变字符串
- 圆角：整柱 `borderTopLeftRadius/Right = 3`，底角 0
- 渐变样式同时写 `backgroundImage` 与 `experimental_backgroundImage`（RN Web / Electron）

## 5. 契约

| 名称 | 位置 |
|---|---|
| `significantCreationSlices(slices)` / `creationDayFill(...)` | `client/color-mix.ts`（纯函数） |
| 日柱渲染 + 渐变样式 | `client/agent-creations.tsx` |

## 6. 验收

- 单测：`client/color-mix.test.ts` 覆盖空 / 单色 / Sep-10 形薄中间切片折叠 / 过滤后单色
- `npm run typecheck` + `npm test` 通过
- `paseo plugin reload activity-dev` → running；目测多色日柱为软渐变，无中间异色细缝
