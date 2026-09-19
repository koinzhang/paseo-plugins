# 016 — Plan（HOW）

## 1. 纯函数

新增 `client/provider-filter.ts`：

```ts
export const PROVIDER_FILTER_LIMIT = 5;

export type ProviderFilterCandidate = {
  provider: string;
  label: string;
  agentCount: number;
  messageCount: number;
};

export function selectProviderOptions(
  providers: ReadonlyArray<ProviderFilterCandidate>,
  selected: string,
  limit = PROVIDER_FILTER_LIMIT,
): Array<{ id: string; label: string }>;
```

- 复制后排序：`agentCount` desc → `messageCount` desc → `provider` asc
- 截取前 `limit`
- `selected !== "all"` 且不在结果中 → 用选中项替换末位（保持 ≤ limit）
- 返回 `{ id, label }`，**不含** All（由调用方拼接）

## 2. UI 接线

`client/global-surface.tsx`：

```ts
const providerOptions = useMemo(
  () => [
    { id: "all", label: "All" },
    ...selectProviderOptions(catalogProviders, providerFilter),
  ],
  [catalogProviders, providerFilter],
);
```

- `filteredProviders` / KPI / 排行继续基于全量 `providers`，不受截断影响
- 现有 effect（选中项不在 catalog 时重置为 All）保留

## 3. 测试

`client/provider-filter.test.ts`（`node --test`）：

- 排名：agentCount 优先，其次 messageCount
- 并列：provider id 字典序
- > 5 截断为 5
- 选中项跌出前 5 → 替换末位，数量不变
- `selected = "all"` 不做保护
- ≤ 5 个候选时全量返回且有序

## 4. 风险

- 排名基于全时段 catalog：长尾 provider 被截断后只能从 All 查看，符合「筛选栏收敛」目标
- 15s 轮询下排名可能变化：选中保护保证当前筛选不会因排名波动而消失
