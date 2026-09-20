# 056 — 创建直方图浮层只列当日有创建的 provider

- 状态：已实现
- 日期：2026-09-20
- 依赖：051（浮层行序与配色）、055（日柱渐变）
- 修订：051 G3 / §4.2 浮层「当日为 0 也列出」以本目录为准；055 G4「浮层不变」同步收窄

## 1. 背景

051 浮层按窗口内全部 provider 列出当日 count，当日为 0 的系列也占一行。空行噪音大，且与柱内 `stackCreationProviders`（当日无创建则省略）不一致。

## 2. 目标

| ID | 目标 |
|---|---|
| G1 | 浮层只渲染当日 `count > 0` 的 provider 行；行序与配色仍跟窗口排名（同 `stackCreationProviders`） |
| G2 | 当日全 0（底槽）时浮层仍可出现，仅显示日期、无 provider 行 |

## 3. 非目标

- 不改 RPC、分桶、窗口排名、日柱渐变 / 配色
- 不改无障碍标签口径（已只含当日有创建的系列）

## 4. 行为

- 浮层行：`stackCreationProviders(ranked, active.providers)` → `label: count`（count 恒 > 0）
- 底部日期与交互（`hovered ?? selected`）不变

## 5. 契约

无新契约；渲染侧过滤，复用 `stackCreationProviders`。

## 6. 验收

- 悬浮多 provider 日：浮层行数 = 当日有创建的 provider 数，无 `…: 0`
- 悬浮空槽日：浮层只有日期
- `npm run typecheck` 通过；`paseo plugin reload activity-dev` → running
