# 025 — Explorer 面板细节（表头 / KPI / agent 筛选）

- 状态：已实现
- 日期：2026-09-19
- 依赖：024（Explorer workspace Activity）

## 1. 目标

| ID | 目标 |
|---|---|
| G1 | 标题 Activity、分支/workspace 名、时间范围 chips 同一行（左：Activity + 名；右：chips；窄宽度允许换行；三者底部对齐；chips 与全局 Activity 页 TextTabs 同款：无下划线，仅颜色/字重区分选中） |
| G2 | KPI 栏用 dense 尺寸（`UsageStats` 新增可选 `dense`）：更小的数值 / 标签 / 内边距 |
| G3 | Agents 区加 Active / Archived 筛选：默认 Active；点击 Archived 展示归档 agent；归档行不提供打开会话链接 |

## 2. 非目标

- 不改 KPI 指标集合与查询口径
- 不改全局 surface / agent panel 的 `UsageStats`（仅新增可选 `dense`）

## 3. 口径

- `usage.agents` 输出新增 `archivedAt`（registry `agents.archived_at`；非 registry agent 为 null → 视为 Active）
- KPI（含 Agents / Messages）仍按 workspace 全量（含归档）统计；筛选只影响 Agents 列表

## 4. 验收

- [ ] 标题 + 分支/workspace 名 + chips 同一行；KPI 更紧凑（实现完成，待真机视觉验收）
- [ ] 默认只列 Active；切到 Archived 列归档 agent；归档行不可点开（实现完成，待真机验收）
- [x] `npm test` / typecheck / reload
