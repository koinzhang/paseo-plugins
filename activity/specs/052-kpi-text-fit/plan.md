# 052 — Plan

## 1. `client/fit-text.ts`

```ts
export type TextMeasurement = { size: number; width: number };

export function fitFontSize(
  measured: TextMeasurement,
  available: number,
  options: { base: number; min?: number },
): number;
```

- 目标字号与「当前字号」无关：`exact = measured.size * available / measured.width`
- `exact >= base` → `base`（放得下 / 变宽回弹）；否则 `clamp(base, min, round(exact * 0.99, 0.1))`
- `min` 缺省 = `max(8, base - 6)`（数值 12、标签 10）
- 非法输入（`width` / `size` / `available` ≤ 0）→ `base`

## 2. `client/usage-stats.tsx`

- 拆出 `StatTile`（每格自持宽度）与 `FitText`（自持测量），`UsageStats` 只负责外框与遍历
- `StatTile`：`onLayout` 取宽度 → `available = width - 2 * padding`；`flexBasis` / 内边距 / 左边框沿用原参数（dense 84 / compact 100 / 默认 120；`bordered = index > 0 && !compact`）
- `FitText`：隐藏测量副本（`0×0` + `overflow: hidden` + 1000px row + `flexShrink: 0` + `opacity: 0` + `pointerEvents="none"`），可见文本 `numberOfLines={1}`；两者共用同一 `TextStyle`（含固定 `lineHeight`）
- 字号由 `measured` 状态派生：`fontSize = fitFontSize(measured, available, { base, min })`

## 3. 影响面

| 面 | 变化 |
|---|---|
| Global KPI | 长值（Top provider / Top model）缩小而非换行；行高与基线恒定 |
| Workspace / Agent KPI（dense） | 同实现受益；常见值仍在 18px |
| 渲染成本 | 每格多一个隐藏 `Text`（全量 6 格 = 12 个），测量后不再变化；不产生额外布局宽度 |

## 4. 风险

| 风险 | 处置 |
|---|---|
| 测量副本影响布局 / 产生横向滚动 | 副本放在 `0×0 + overflow: hidden` 的绝对定位盒子里；实测 `bodyScrollWidth == innerWidth` |
| 缩放抖动（测一次缩一次再测再缩） | 目标字号由单次测量绝对推导，不依赖当前字号；同值 setState 被 React 忽略 |
| 宿主不支持 `onLayout` 或测量失败 | `fitFontSize` 回退 `base`；`numberOfLines={1}` 保证只可能截断、不会换行 |
| 字号过小不可读 | `min` 下限（数值 12 / 标签 10）；12px 下限下 106px 可用宽度可容纳约 17 个字符，覆盖现有全部 KPI 文案 |
