# 071 — Oh My Pi 与 Pi 分开统计

## 背景

`normalizeProvider` 自 001 起把 `omp` 归一为 `pi`，所有按 provider 聚合的视图（筛选下拉、KPI、Providers / Projects 排行、按 provider 过滤的热力图 / Timeline、Workspace / Agent 面板）都把 Oh My Pi 并进 Pi。Paseo 的 provider manifest（`packages/protocol/src/provider-manifest.ts`）中 `pi`（Pi）与 `omp`（Oh My Pi）是两个独立的内置 provider。051 为直方图配色另加的 `brandProviderId` 只是绕行。

## 目标

- `normalizeProvider("omp") === "omp"`；Oh My Pi 在所有视图中作为独立 provider 显示与筛选。
- 删除 `brandProviderId`，配色与直方图统一用 `normalizeProvider`。

## 非目标

- 无数据迁移：库中 `provider` 一直存原始 id（`omp` / `pi`），只改聚合口径。

## 验收

- 本机库：Oh My Pi 43 会话 / 132 提示词，Pi 52 / 66（此前合并为 Pi 95 / 198）。
