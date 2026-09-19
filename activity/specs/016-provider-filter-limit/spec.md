# 016 — Provider 筛选栏最多 5 个

- 状态：已实现
- 日期：2026-09-19
- 依赖：001（by-provider / 全局 UI）、005（agents）、006（messages）

## 1. 背景

全局 Activity 的 provider 筛选栏展示全时段 catalog 里的**所有** provider。provider 一多，芯片行会挤占整行、把时间范围筛选挤乱，且长尾 provider 几乎没有点击价值。

## 2. 目标

| ID | 目标 |
|---|---|
| G1 | 筛选栏最多显示 5 个 provider 芯片（另有 All） |
| G2 | 排名：agentCount 降序 → messageCount 降序 → provider id 升序 |
| G3 | 排名数据源固定为全时段 catalog，不随时间范围切换跳动 |
| G4 | 当前选中的 provider 若跌出前 5，仍显示（替换第 5 位），保持筛选可见 |
| G5 | 纯函数实现 + 单测覆盖 |

## 3. 非目标

| ID | 非目标 | 说明 |
|---|---|---|
| NG1 | 改统计口径 / All 汇总 | 仅筛选栏芯片；KPI、排行仍用全部 provider 数据 |
| NG2 | 新 RPC / 服务端改动 | 纯客户端展示层 |
| NG3 | 时间范围影响芯片排名 | 排名固定用全时段 catalog（与现状芯片来源一致） |
| NG4 | 「更多」展开 / 下拉 | 本版不做，被截断的 provider 仍通过 All 汇总可见 |

## 4. 口径

| 项 | 规则 |
|---|---|
| 候选 | `usage.by-provider`（全时段，`{}`）返回的 providers |
| 排名 | `agentCount` desc → `messageCount` desc → `provider` asc |
| 上限 | 5（`PROVIDER_FILTER_LIMIT`） |
| 选中保护 | 选中项不在前 5 时替换末位，provider 芯片总数仍 ≤ 5 |
| 渲染 | 芯片数（含 All）> 1 才显示筛选栏（沿用现状） |

## 5. 验收

- [x] provider 数 > 5 时只显示前 5
- [x] 排名优先 agentCount，其次 messageCount
- [x] 选中项跌出前 5 仍可见（替换第 5 位）
- [x] 单测覆盖排名 / 截断 / 选中保护 / 并列
- [x] `npm run typecheck`、`npm test` 通过
