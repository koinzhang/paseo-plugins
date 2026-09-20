# 057 — 创建直方图日柱改用主题 accent 强度色

- 状态：已实现，页面验收待完成
- 日期：2026-09-21
- 依赖：051（浮层 provider 明细与品牌色）、055（日柱整块填充）、056（浮层非零行）
- 修订：055 §G2 / §4「provider 软渐变填柱」、051 §4.2「柱色跟 provider」以本目录为准；浮层色块仍走品牌 / CHART_PALETTE

## 1. 背景

Global 面 Activity 热力图用 `surface2 → theme.accent` 强度阶；紧挨其下的 Agents 直方图日柱却用 provider 品牌色 / soft palette。两图语义不同（活跃度 vs 谁创建），但主色冲突，页面读起来割裂。

方案：日柱与热力图同色系表达「多少」；provider 身份只留在 hover / focus / click 浮层。

## 2. 目标

| ID | 目标 |
|---|---|
| G1 | 有创建的日柱为**单色**填充：`mix(surface2, accent, step)`，阶与热力图相同（`activityLevel` + `ACTIVITY_MIX_STEPS`） |
| G2 | 柱色只跟当日总量相对窗口峰值，**不**再按 provider 渐变 / 品牌色 |
| G3 | 浮层小方块与行序仍用 `creationProviderColors`（品牌色或 soft palette）；空槽与交互不变 |
| G4 | 去掉仅服务于 055 渐变柱的 `creationDayFill` / `significantCreationSlices` |

## 3. 非目标

- 不改 RPC、分桶、窗口、柱高公式、圆角、浮层过滤（056）
- 不改热力图配色
- 不给直方图加图例行

## 4. 行为

- 日柱：`count > 0` → `creationBarColor(count, windowMax, surface2, accent)`；`count === 0` → 2px `surface2` 底槽（无圆角）
- `creationBarColor`：`activityLevel(count, max)` ∈ 1..4 → `ACTIVITY_MIX_STEPS[level-1]` 混入 accent；level 0 → `surface2`
- 顶角 3px、底角直角（055 整柱形状保留）
- 浮层：色块 `colorByProvider.get(provider) ?? accent`；行序仍 `stackCreationProviders`

## 5. 契约

| 名称 | 位置 |
|---|---|
| `creationBarColor(count, max, surface2, accent)` | `client/color-mix.ts` |
| 日柱渲染 | `client/agent-creations.tsx` |

删除：`creationDayFill`、`significantCreationSlices`、`CreationDayFill`、`CREATION_GRADIENT_MIN_SHARE`、`CREATION_GRADIENT_MAX_COLORS`。

## 6. 验收

- 单测：`client/color-mix.test.ts` 覆盖空 / 低 / 峰值强度
- 目测：直方图与热力图同为 accent 阶；悬浮浮层仍见 provider 品牌色小方块
- `npm run typecheck` + `npm test`；`paseo plugin reload activity-dev` → running
