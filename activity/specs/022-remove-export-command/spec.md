# 022 — 移除 Command Center「Export activity report」

- 状态：已实现
- 日期：2026-09-19
- 依赖：001（US-8 导出报告）、012（B1 剪贴板）

## 1. 目标

Command Center 的 Activity 快捷项由 3 个减为 2 个，移除「Export activity report」。

## 2. 非目标

- 不删 `usage.export` RPC / server handler（`usage.*` 契约稳定，保留可编程导出）
- 不改 panel / pill / 全局 surface

## 3. 验收

- [x] `index.client.tsx` 不再注册 export Command Center item；清理 `copyText` / `usageExportRpc` 客户端 import
- [x] `npm run typecheck` 通过
- [x] `paseo plugin reload activity`
