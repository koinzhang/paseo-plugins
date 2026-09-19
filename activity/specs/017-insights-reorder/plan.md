# 017 — 实现方案

## 1. `shared/insights.ts`

- 恢复 `topProviderValue(providers, providerFilter)`：`providerFilter !== "all"` 或无 messages → `—`；否则按 `messageCount` 降序，并列按 provider id 字典序；展示 `label · N%`（相对 messages 合计）。
- `buildActivityInsights` 行序改为 017 spec §4；去掉 Tools per message。

## 2. 测试

`shared/insights.test.ts`：更新期望 labels；断言 Top provider 仅 All；筛选时 Top provider=`—` 且 Top model 仍有值。

## 3. 文档

`specs/README.md` 增加 017。
