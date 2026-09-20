# 056 — Plan

## 改动

`client/agent-creations.tsx`：浮层 `providers.map` 改为 `stackCreationProviders(providers, active.providers).map`，直接用切片上的 `count`（去掉 `countByProvider` 兜底 0）。

## 不改

- `rankCreationProviders` / 配色 / 柱填充
- `providerBreakdown`（无障碍已走 stack）
