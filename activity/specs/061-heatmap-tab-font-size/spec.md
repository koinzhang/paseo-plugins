# 061 — 热力图 mode tabs 与月份轴同字号

## 1. 背景

热力图右上角的 `Daily / Weekly / Cumulative` 用 `compact ? 13 : 15`，而同一张图的横轴月份标签固定 `12`。
两者都是 section 标题（`Activity`）之下的次级标签，却分属两套字号：tab 行看起来比它标注的坐标轴更重，
窄面板（compact）下 13 / 12 的差异尤其像排版抖动。

## 2. 目标

| 编号 | 目标 |
|---|---|
| G1 | `Daily / Weekly / Cumulative` 字号 = 横轴月份标签字号（12） |
| G2 | 两个字号由同一个常量驱动，不再各写各的数值 |
| G3 | 选中 / 未选中的颜色、`paddingVertical` 点击热区、`Activity` 标题字号不变 |

## 3. 非目标

- 不改月份标签的 hover 高亮、`space-between` 布局与最多 12 个标签的规则（见 002 / 003 / 060）
- 不改 tooltip 字号（同为 12，但属于浮层，不与该常量绑定）
- 不改三档语义（Daily / Weekly / Cumulative 口径见 004 / 048 / 058）

## 4. 行为

- `client/activity-heatmap.tsx` 顶层常量 `LABEL_FONT_SIZE = 12`，mode tabs 与月份标签共用。
- 字号不再随 `compact` 变化：与月份标签一致，两种宽度下都是 12。
- tab 的 `paddingVertical: 6` 保留，缩小字号后点击热区仍高于文字本身。

## 5. 验收

| 编号 | 验收 |
|---|---|
| A1 | Global Activity 热力图右上角三档标签与横轴月份标签视觉同高 |
| A2 | 窄面板（compact）与宽面板下均为 12，无 13 / 15 分支残留 |
| A3 | `npm run typecheck` 通过；`grep fontSize` 在热力图内不再出现 `compact ? 13 : 15` |
