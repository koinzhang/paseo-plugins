# 002 — 全局调用活动热力图（activity heatmap）

- 状态：已实现
- 日期：2026-09-19
- 依赖：001（tool_calls 已有 `ts` / `ingested_at`）

## 1. 目标

在侧边栏 **Activity** 全局页，用类似 GitHub contribution 的按天格子图展示 skill / MCP 调用密度，让时间分布一眼可见。

## 2. 非目标

- 不做折线图 / 周×小时热力图（本版仅日历贡献图）
- 不改 pill / agent panel
- 不要求绝对精确时间（沿用 001 NG5：`COALESCE(ts, ingested_at)`）

## 3. 行为

- 有效时间：`ts ?? ingestedAt`
- 计数：skill（不含 `confidence=low`）与 mcp 分列，格子强度用 `skills + mcp`
- 过滤：与全局页同一时间 range；provider ≠ All 时只计该 provider（normalize 后）
- 窗口：有 `from` 时从该日起到今天；`All` 时取固定 **52 周**（当前周 + 前 51 周，对齐 ChatGPT）
- UI：对齐 ChatGPT activity 页——KPI 横条、Tool activity 热力图（Daily / Weekly / Cumulative）、Activity insights + Most used skills / MCP
- 热力图：周日为一周起点；点选某天显示当日 skills / mcp 数（agents 见 004/005；**messages 见 006**）
- 横轴月份：最多 12 个；年窗口取截止今日的连续 12 个月（如 Oct…Sep）；`space-between` 首尾贴边、中间等距；不按月首周对齐、不因拥挤丢弃标签

## 4. RPC

`usage.activity-by-day` — 见 `shared/usage.ts`（zod 为真相源）。
