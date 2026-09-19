# 027 — Explorer 去掉表头（分支名 / 时间 chips）

- 状态：已实现
- 日期：2026-09-19
- 依赖：025 / 026

## 1. 目标

| ID | 目标 |
|---|---|
| G1 | 移除 Explorer Activity 面板顶部的 **分支/workspace 名** 与 **时间范围 chips**（Today / 7D / 30D / All） |
| G2 | 查询固定为该 workspace **全部时间**（不再传 `from`） |

## 2. 非目标

- 不改全局 surface / agent panel 的时间筛选
- 不改 KPI / Agents / Skills·MCP 区本身

## 3. 验收

- [x] 面板首屏直接是 KPI（或空态 / loading）；无分支名、无时间 chips
- [x] typecheck / reload
