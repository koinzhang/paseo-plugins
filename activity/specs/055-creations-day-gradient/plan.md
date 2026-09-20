# 055 — Plan

## 1. `client/color-mix.ts`

```ts
export function significantCreationSlices(slices, { minShare = 0.15, maxColors = 3 })
export function creationDayFill(slices, colorOf, fallback): CreationDayFill
```

- 薄切片（&lt; 15% 且非 peak）不进画笔，避免夹在两大色之间形成分割线
- 存活色：`linear-gradient(to bottom, c0, c1, …)` 均匀过渡（count 只决定谁入选）

## 2. `client/agent-creations.tsx`

- `dayBarStyle`：solid → `backgroundColor`；gradient → 同时写 `backgroundImage` + `experimental_backgroundImage`；顶角 3px
- 浮层 / a11y 仍用完整 `stackCreationProviders` 列表

## 3. 影响面

| 面 | 变化 |
|---|---|
| Global Agents 直方图 | 硬堆叠 → 整柱软渐变 |
| RPC / 分桶 / 浮层 | 无 |

## 4. 风险

| 风险 | 处置 |
|---|---|
| RN Web 不认 `experimental_backgroundImage` | `Platform.select`：web 用 `backgroundImage` |
| 薄中间色把渐变切成硬缝 | `significantCreationSlices` 丢弃 &lt; 15% 非 peak；存活色均匀过渡 |
