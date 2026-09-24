# 077 — Global provider 筛选右对齐

## 背景

Global Activity 页面顶部 `Provider: All ▾` 筛选（069）靠左，位于 KPI 之前；页面主体内容居中且宽度上限 780，筛选栏单独占一行却贴左，视觉上与大标题 / KPI 的居中块不对齐。

## 目标

1. **筛选栏右对齐**：Global surface 顶部 `Provider: All ▾` 移到内容区（`maxWidth` 780）右边缘。
2. **菜单不溢出**：下拉浮层仍开在触发器下方，右边缘与触发器对齐（向左展开），不越过页面 padding。

## 非目标

- 不改筛选语义 / RPC / 选项排序 / i18n（仍 `Provider: All ▾`，069 行为不变）。
- 不改 Workspace / Agent 层。
- 不改「仅一个 provider 时隐藏筛选」的规则。

## 验收

- Global 页面筛选触发器贴内容区右边缘；展开菜单在触发器下方且完全落在内容区内（左 / 右均不溢出）。
- compact（窄屏）下同样右对齐且不裁切。
- `npm run typecheck` / `npm test` 通过。
