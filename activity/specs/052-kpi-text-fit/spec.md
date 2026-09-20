# 052 — KPI 数值自适应缩小（不换行）

- 状态：已实现
- 日期：2026-09-20
- 依赖：025（dense KPI）、050（Global KPI 6 格：Top provider / Top model 值形如 `Cursor · 61%`）

## 1. 背景

Global KPI 在宽面板下每格约 130px，去掉 12px 内边距只剩 ~106px 可用；`Cursor · 61%`（18px ≈ 109px）、`Auto Smart · 64%`（≈ 148px）放不下，宿主文本默认换行 → 这两格的数值折成两行，标签被顶下去，整行高度与基线不齐。

`UsageStats` 的数值此前既没有 `numberOfLines` 也没有自适应：要么换行（现状），要么截断成 `Cursor · 6…`，两者都不可读。

## 2. 目标

| ID | 目标 |
|---|---|
| G1 | KPI 数值 / 标签**永不换行**（`numberOfLines={1}` 兜底） |
| G2 | 放不下时按测量结果缩小字号，直到放进可用宽度；最小 12px（标签 10px） |
| G3 | 放得下时保持基准字号（数值 18px / 标签 12px），格子变宽后能**长回**基准 |
| G4 | 行高固定（数值 22px / 标签 16px），各格字号不同也不影响基线对齐 |
| G5 | 三层共用同一实现（Global / Workspace / Agent 都用 `UsageStats`） |

## 3. 非目标

- 不改 KPI 指标集合、顺序与文案（050）
- 不改 `flexBasis` / 内边距 / 边框等既有布局参数
- 不做多行省略号或 tooltip 兜底（缩到下限仍放不下才允许截断，且 12px 下限下实测不会发生）
- 不引入 `adjustsFontSizeToFit`：宿主渲染层（react-native-web）不实现该属性

## 4. 行为

- 每格用 `onLayout` 记录自身宽度 → `available = width - 2 * padding`（dense 8px，其余 12px）
- 数值与标签各有一个**隐藏测量副本**：绝对定位在 `0×0 + overflow: hidden` 的盒子里，内部是 1000px 宽的 row，文本 `flexShrink: 0` —— 这样测到的是**固有宽度**（受约束的副本只会回报被夹紧后的宽度，实测 80px 容器里只回报 78）
- `fitFontSize({ size, width }, available, { base, min })`：宽度随字号线性缩放，因此目标字号 = `size * available / width`，与当前渲染字号无关（一次测量即可收敛，不会来回抖动）
  - `target ≥ base` → 用 base（放得下 / 变宽后回弹）
  - 否则 `target = clamp(base, min, round(target * 0.99, 0.1))`，1% 余量避免亚像素四舍五入触发省略号
  - 测量不可用（宽度 0 / 可用宽度 0）→ 返回 base
- 可见文本用同一字号渲染，行高固定，故各格基线一致

## 5. 契约

| 名称 | 位置 |
|---|---|
| `fitFontSize(measured, available, { base, min? })` | `client/fit-text.ts`（纯函数） |
| `TextMeasurement = { size, width }` | `client/fit-text.ts` |
| `FitText` / `StatTile`（内部组件） | `client/usage-stats.tsx` |

## 6. 验收（浏览器实测）

用 react-native-web 离线渲染真实组件（见 tasks 备注的 harness 命令）：

| 场景 | 结果 |
|---|---|
| 784px / 6 格（Global） | `453` `14.2 days` `83` `8 days` 18px；`Cursor · 61%` **17.3px**；`Auto Smart · 64%` **12.4px**；全部单行、无截断 |
| 340px / 4 格（dense，Workspace / Agent） | 全部 18px 单行 |
| 300px / 3 格（窄面板） | `OpenCode · 44%` 15.5px、`Auto Smart · 64%` 15px、`14.2 days · active` 18px，全部单行 |
| 布局 | 各格等高、标签同一基线；隐藏测量盒不产生横向溢出（`bodyScrollWidth == innerWidth`） |
| 单测 | `client/fit-text.test.ts`（6 例：放得下保持、按溢出缩放、与当前字号无关、变宽回弹、min/base 夹紧、非法测量） |
