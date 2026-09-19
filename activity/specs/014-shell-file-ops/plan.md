# 014 — Plan

## 1. 聚合（shared）

在 `shared/usage.ts`（或紧邻小模块）导出：

- `isShellCall` / `isFileRead` / `isFileWrite`
- 修正 `summarizeRows`（`server/handlers.ts`）、`aggregateByProvider`、`aggregateShellTop` 使用上述谓词
- `usage.summary` output 增加 `fileReads` / `fileWrites`（非负 int）
- `usage.by-provider` 的 `totals` 与每个 provider 增加 `fileReads` / `fileWrites`；`shellCalls` 改口径

`toolCallsByKind` 仍按原始 `detailType` 全量计数（诊断用），不要求互斥。

## 2. UI

- `client/global-surface.tsx`：summary 汇总 shell/file；KPI 三项；Top shell 排行（复用 by-provider 行或客户端对 shell 二次聚合——优先在 by-provider 增加 `shellTop` 可选，或全局一次 `usage.summary` + list；**更简**：在 `aggregateByProvider` 不返回 top，客户端对当前窗无单行命令。命令仅在行上：需 RPC。

**Shell top 数据路径（选定）**：扩展 `usage.by-provider` 每个 provider 与 totals 不强制带 top；新增轻量字段：

- 方案 A：`usage.shell-top` RPC（agentId/from/to/provider 可选）→ `aggregateShellTop`
- 方案 B：by-provider 输出 `shellTop: { command, count, failures }[]`（全窗已合并）

采用 **方案 A** 更干净；全局 All provider 时不传 provider。为少 RPC，采用 **方案 B 简化版**：只在 `totals` 旁增加顶层 `shellTop`（对传入 rows 全体 `aggregateShellTop`，再按 provider 筛选后的 rows 计算——handler 内对 select 结果过滤 provider 后聚合）。

实际：`createByProviderHandler` 已有全量 rows；在返回值增加 `shellTop: aggregateShellTop(filteredRows)`。Provider 单选时 handler 仍返回全 providers 列表，客户端用当前 filtered 行……客户端没有原始 rows。

故：**在 `usageByProviderRpc` output 增加 `shellTop`**，handler 对 `store.select(filter)` 的**全部**行做 `aggregateShellTop`；provider 芯片过滤时，若 filter≠all，handler 不按 provider 滤 tool rows 今天也是返回全 providers——客户端 `filteredProviders` 只滤展示。Shell top 需随 provider 变：

- handler 返回每个 `providers[].shellTop`（该 provider 的行），客户端 All 时合并 counts，单选时用该 provider 的 shellTop。

## 3. Panel

`usage.summary` 增加 file 字段后，panel `useRpc(usageSummaryRpc)` + agentId，KPI 读 shellCalls / fileReads / fileWrites。

## 4. 测试

- `usage.test.ts`：low-skill shell 不计 shellCalls；skill read 不计 fileReads；regular 三类分计
- `aggregateShellTop`：排除 category=skill
- 既有 classify 测保留（证明入库形态不变）

## 5. 文档

- `specs/README.md` 索引 014
- 001 NG10 注明「已由 014 部分撤销（UI）」；不改写整份 001 历史
