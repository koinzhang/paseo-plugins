# 059 — 最近 7 天小时活动时间线

- 状态：已实现，页面验收待完成
- 日期：2026-09-21
- 依赖：006（Messages）、058（时间从左到右、现在在最右）

## 1. 目标

| ID | 目标 |
|---|---|
| G1 | Global Activity 展示最近 168 个连续小时桶，最新的当前小时固定在最右侧 |
| G2 | 视窗固定显示 24 小时，鼠标按住图表左右拖动看更早小时（不显示滚动条） |
| G3 | 无活动的小时仍占一个槽位，不压缩时间 |
| G4 | 小时带使用独立固定 7 天窗口，不受 Today / 7D / 30D / All chips 影响 |
| G5 | 折线面积图：时间轴上方 messages，下方 agents；skills / MCP 只在明细里 |
| G6 | 悬浮、键盘 focus 或点击小时格显示各类明细与本地小时范围 |
| G7 | 放在 Agents 30 日创建直方图下方、Insights 上方 |

## 2. 非目标

- 不统计 token、费用、assistant output 或 reasoning
- 不做 agent 持续时长 / 甘特图
- 不做无限历史；服务端只查询当前 168 小时窗口
- 不跟热力图选中日联动
- 不受 range chips 影响；provider chip 仍生效

## 3. 时间与口径

- 服务端将当前时刻向下取整到绝对小时，生成 `[currentHour - 167h, currentHour]`。
- 小时桶按 epoch 小时连续递增，恒为 168 个；DST 回退可能出现两个相同本地钟点，
  但它们是两个不同的真实小时；DST 跳进不会伪造不存在的本地小时。
- tools：只计 skill（排除 low confidence）与 MCP，和日热力图一致。
- messages：`ts ?? ingestedAt`；agents：`createdAt`。
- 当前小时是未封口桶，15 秒轮询后数字可以继续增长。

## 4. UI

- 发散折线面积图：1px `border` 轴线居中，上半区 messages（`accent` 描边），
  下半区 agents（弱化 accent 描边，整块 `scaleY(-1)` 镜像）。
- 宿主只暴露 RN 原语（无 SVG / canvas）：每个小时间隔是一个 `overflow: hidden`
  的格子，内部一块 `skewY` 平行四边形——顶边即折线段，主体即面积填充；
  描边用 `borderTopWidth = STROKE × hypot(1, tan)` 抵消斜切造成的视觉变细。
- 两条序列各自按自身峰值归一（agents 量级远小于 messages），峰值写进读数行。
- 步长 `width / 24`：一屏正好 24 小时，其余 144 小时靠横向 `ScrollView` 滚动。
- 主要用户是鼠标用户，而 RNW 的横向滚动不吃竖向滚轮：隐藏滚动条，改为
  `PanResponder` 按住拖拽平移；手势明显横向（|dx| > 3 且 |dx| > |dy|）才接管，
  保证悬浮 / 点击某个小时和页面竖向滚动都不受影响；不加翻页按钮。
- 右端必须与上方直方图 / 热力图对齐：hover 热区在首尾各溢出半格，
  必须裁剪（`overflow: hidden`），否则溢出会被算进滚动内容宽度，
  滚到底时右侧空出半格。
- 默认贴右；用户滚进历史后 15 秒轮询不抢回位置，回到最右端才重新吸附。
- 悬浮 / focus / 点击：竖直指示线 + 读数行给出本地小时范围与四类明细。
- 轴下方按本地零点打日期刻度，最右角标 `Now`。

## 5. 验收

- [x] RPC 恒返回 168 个按小时连续且唯一的桶，末桶为当前小时
- [x] provider 过滤同时作用于四类计数
- [x] 空小时保留，DST / 无效时间不导致漏桶或重复 key
- [x] 一屏 24 小时、默认在最右；鼠标按住拖动可向左翻历史
- [ ] 右端与 Agents 直方图右边缘对齐（页面目测）
- [x] 位于 Agents 直方图下方
- [x] `npm test`、`npm run typecheck`、`paseo plugin reload activity-dev`
