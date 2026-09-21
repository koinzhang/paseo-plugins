# 060 — Global 各 section 间距节奏统一

- 状态：已实现，页面验收待完成
- 日期：2026-09-21
- 依赖：003（Global 布局 / 圆角统计条）、050 / 051（KPI、直方图）、059（时间线）

## 1. 背景

Global Activity 的 section 间距只有一处来源：ScrollView content 的 `gap: 24 / 32`
（`client/global-surface.tsx`）。结构上每个 section 都是 content 的直接子节点、各自不带
margin，但**视觉间距并不相等**——差别全部来自各 section 末尾元素自带的隐形留白：

| Section | 末尾元素 | 底部隐形留白（regular） | 到下一节字形的间距 |
|---|---|---|---|
| KPI 条 | 带边框卡片 `paddingVertical: 18` + tile `paddingVertical: 4` | ≈ 22px | ≈ 56px |
| Activity 热力图 | 月份行固定 `height: 24`（12px 文字）+ 内层 `paddingBottom: 4` | ≈ 12px | ≈ 46px |
| Agents 直方图 | 底部日期行，自然高度 | ≈ 0 | ≈ 34px |
| Timeline | readout 文本，自然高度 | ≈ 0 | ≈ 34px |

section 内部「标题 → 内容」同样不齐：热力图 / 直方图 `compact ? 10 : 12`，
Timeline `compact ? 8 : 10`，insights 与排行块固定 12（`titleRow.marginBottom: 10`
+ `block.gap: 2`）。compact 下因此出现 10 / 10 / 8 / 12 / 12 三个值。

## 2. 目标

| ID | 目标 |
|---|---|
| G1 | 图表 section 末尾不再自带额外留白：字形到字形的节间距 ≈ 容器 gap（32）+ 一行文字的自然下延 |
| G2 | 每个 section「标题 → 内容」= 10（compact）/ 12（regular），热力图 / 直方图 / Timeline / insights / 排行五处一致 |
| G3 | 不改列表行密度（insights 与排行行 `paddingVertical: 9`、行间 2px 不变） |
| G4 | 不改容器 gap（24 / 32）、页面内边距与 `maxWidth: 780` |

## 3. 非目标

- KPI 条的 18px 内边距保留：卡片有边框，视觉边界是卡片边而不是文字
- 不改 Agent / Workspace 两个 panel 的 20 / 28、20 / 26（跨层节奏另议）
- 不改字号、颜色、图例文案与各 section 的内部布局

## 4. 行为

- 热力图月份行去掉固定 `height: 24`，按内容自然高度排布（12px 文字 + `paddingVertical: 2`）；
  内层 `paddingBottom: 4` 一并去掉（tooltip 挂在 ScrollView 之外，不依赖它）
- Timeline 根 gap `compact ? 8 : 10` → `compact ? 10 : 12`
- `titleRow.marginBottom` 与 insights 标题的内联 `marginBottom` 由固定 10 改为
  `layout.compact ? 8 : 10`，与保留的 `block.gap: 2` 相加得到 10 / 12

## 5. 取舍

月份行不再有固定高度，末尾留白由字体下延决定（不同平台 ±2px），换来的是与其它
section 一致的尾部节奏；列表行密度刻意不动，避免把「间距统一」扩成「列表变紧」。

## 6. 验收

- [x] 代码：热力图尾部留白、Timeline 内部 gap、insights / 排行标题间距三处按 §4 落地
- [x] `npm run typecheck`、`npm test` 通过；`paseo plugin reload activity-dev` 后 running
- [ ] 目测：KPI → 热力图 → 直方图 → Timeline → insights / 排行，相邻两节的字形间距一致
- [ ] 目测：五个 section 的「标题 → 内容」间距一致（10 / 12）
