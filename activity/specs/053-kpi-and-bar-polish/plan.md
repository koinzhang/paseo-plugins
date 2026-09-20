# 053 — Plan

## 1. `shared/insights.ts`

```ts
/** Messages-weighted top provider (050); label only — no share (053). */
function topProviderValue(providers, providerFilter): string {
  if (providerFilter !== "all") return providers.find(p => p.provider === providerFilter)?.label ?? "—";
  return ranked[0]?.label ?? "—";
}

/** Messages-weighted top model (050); label only — no share (053). */
function topModelValue(providers, providerFilter): string {
  return formatDisplayName(top[0]);
}
```

- 排名与过滤逻辑不变，只去掉 `total` / `pct` 计算与 `${label} · ${pct}%` 拼接
- 过滤态原本已只显示名称，现在两个分支同形

## 2. `client/agent-creations.tsx`

```tsx
bucket.providers.map((slice, index) => (
  <View style={{
    height: …,
    borderTopLeftRadius: index === 0 ? 3 : 0,
    borderTopRightRadius: index === 0 ? 3 : 0,
    backgroundColor: …,
  }} />
))
```

- DOM 顺序第一段 = 视觉最上方（柱容器 `justifyContent: "flex-end"`，子元素自上而下排列），故 `index === 0` 取上圆角
- 空槽（当日 0 创建）去掉 `borderRadius: 3`

## 3. 影响面

| 面 | 变化 |
|---|---|
| Global KPI | Top provider / Top model 值变短 → 恢复 18px，与同排其它格一致 |
| 直方图 | 接缝直角、柱顶圆角；柱高与配色不变 |
| RPC / 数据 | 无变化 |

## 4. 风险

| 风险 | 处置 |
|---|---|
| 用户仍想知道占比 | 占比未从数据面移除，需要时可回到 `usage.by-provider` 或列表；本次仅按诉求去掉 KPI 文案 |
| 单段柱（当日只有一种 provider）底边直角显得突兀 | 与多段柱的底边一致（都直角），符合「只有最上方一段带上圆角」的规则 |
