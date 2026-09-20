# 057 — plan

## 1. `client/color-mix.ts`

- 保留 `mixColor` / `ACTIVITY_MIX_STEPS`
- 新增 `creationBarColor`：内部调用 `activityLevel`（`shared/activity.ts`）
- 删除 055 渐变柱相关导出与常量

## 2. `client/agent-creations.tsx`

- 日柱：`backgroundColor: creationBarColor(bucket.count, max, colors.surface2, colors.accent)` + 顶角 3px
- 去掉 `dayBarStyle` / `creationDayFill` 路径
- `creationProviderColors` 仅服务浮层色块

## 3. 测试

- 重写 `color-mix.test.ts`：`creationBarColor` 空→surface2；同 max 时峰值色更深于小值；非法 hex 时 `mixColor` 回退行为仍由既有路径覆盖

## 4. 风险

| 风险 | 缓解 |
|---|---|
| 失去柱上多 provider 一眼可读 | 浮层仍列品牌色；accessibility 标签不变 |
| 与 055 渐变验收冲突 | 055 柱填色以本目录为准，标修订 |
