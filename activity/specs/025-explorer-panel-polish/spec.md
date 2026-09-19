# 025 — Explorer 面板细节（表头 / KPI / agent 筛选）

- 状态：已实现
- 日期：2026-09-19
- 依赖：024（Explorer workspace Activity）

## 1. 目标

| ID | 目标 |
|---|---|
| G1 | 面板内不再显示 Activity 页标题；左侧只显示分支/workspace 名（字体与时间 chips 一致：14 / 500 / muted），与右侧时间 chips 同一行、底部（基线）对齐；窄宽度允许换行；chips 与全局 Activity 页 TextTabs 同款：无下划线，仅颜色/字重区分选中 |
| G2 | KPI 栏用 dense 尺寸（`UsageStats` 新增可选 `dense`）：更小的数值 / 标签 / 内边距；指标只保留 **Shell calls / File reads / File writes / Messages**（不含 skill / MCP / agents） |
| G3 | Agents 区加 Active / Archived 筛选：默认 Active；点击 Archived 展示归档 agent；归档行不提供打开会话链接 |
| G4 | Skills / MCP 合并为一个排行区：默认 **Skills**，点标题右侧图标切到 **MCP**（同全局 Activity 的 rank 图标切换；标题保持 Skills / MCP，不用 "Most used" 前缀），不再上下堆叠 |

## 2. 非目标

- 不改 KPI 指标集合与查询口径
- 不改全局 surface / agent panel 的 `UsageStats`（仅新增可选 `dense`）

## 3. 口径

- `usage.agents` 输出新增 `archivedAt`（registry `agents.archived_at`；非 registry agent 为 null → 视为 Active）
- KPI（含 Agents / Messages）仍按 workspace 全量（含归档）统计；筛选只影响 Agents 列表

## 4. 验收

- [ ] 无 Activity 页标题；分支名与 chips 同字体、同一行对齐；KPI 更紧凑且仅 Shell / File reads / File writes / Messages（实现完成，待真机视觉验收）
- [ ] 默认只列 Active；切到 Archived 列归档 agent；归档行不可点开（实现完成，待真机验收）
- [ ] 默认显示 Skills；点标题右侧图标切到 MCP（实现完成，待真机验收）
- [x] `npm test` / typecheck / reload
