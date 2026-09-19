# 011 — contracts

> 以 `shared/usage.ts` zod 为真相源。

## usage.by-provider

`ProviderUsageItem` 增加：

```ts
workspaceCount: number;  // 该 provider 下 agents 非空 workspace_id 去重
```

`totals` 增加：

```ts
workspaceCount: number;  // 全 provider 全局去重；UI All 视图用此值，勿对各 provider 求和
```

全局 KPI Workspaces：

- provider = All → `totals.workspaceCount`
- provider = 单家 → 该行 `workspaceCount`
