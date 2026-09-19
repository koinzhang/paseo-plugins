# 025 — Explorer 面板细节（表头 / KPI / agent 筛选）

- 状态：已实现
- 日期：2026-09-19
- 依赖：024（Explorer workspace Activity）

## 1. 目标

| ID | 目标 |
|---|---|
| G1 | 面板内不再显示 Activity 页标题；左侧只显示分支/workspace 名（字体与时间 chips 一致：14 / 500 / muted），与右侧时间 chips 同一行、底部（基线）对齐；窄宽度允许换行；chips 与全局 Activity 页 TextTabs 同款：无下划线，仅颜色/字重区分选中 |
| G2 | KPI 栏用 dense 尺寸（`UsageStats` 新增可选 `dense`）：更小的数值 / 标签 / 内边距；指标只保留 **Shell calls / File reads / File writes / Messages**（不含 skill / MCP / agents） |
| G3 | Agents 区默认按 **创建时间倒序**；标题右侧设置图标展开**悬浮菜单卡片**（absolute 定位于图标下方，不把列表顶下去；点卡片外关闭；再点图标收起并回到 root），行样式为 label 左 + 当前值 + `ChevronRight` 右，可进子页选择并返回 |
| G4 | Skills / MCP 合并为一个排行区：默认 **Skills**，点标题右侧图标切到 **MCP**（同全局 Activity 的 rank 图标切换；标题保持 Skills / MCP，不用 "Most used" 前缀），不再上下堆叠 |
| G5 | **Sort**：Created（默认，创建时间倒序）/ Updated（更新时间倒序）/ Name（字典序）/ Messages（消息数倒序）/ Status（值得关注的状态置顶） |
| G6 | **Group**：None（默认）/ Provider（按 provider 分组，组标题为 providerLabel） |
| G7 | **Show**：Active（默认，`archivedAt == null`）/ Archived（`archivedAt != null`）；归档行不提供打开会话链接 |
| G8 | Status 数据来自客户端 `paseo.agents.list`（`includeArchived`，15s 轮询）：rank = attention（`requiresAttention` / `permission` / `error`）0 → running 1 → idle 2 → initializing 3 → closed/unknown 4；同级按 Updated 降序 |
| G9 | workspace 级 Command Center「Workspace Activity」→ `openPanel("workspace-activity", { location: "explorer" })`；Explorer 面板本身由宿主管理（无法默认展示，需手动添加一次），此项提供 ⌘K 快捷打开 |

## 2. 非目标

- 不改 KPI 指标集合与查询口径
- 不改全局 surface / agent panel 的 `UsageStats`（仅新增可选 `dense`）

## 3. 口径

- `usage.agents` 输出新增 `archivedAt`（registry `agents.archived_at`；非 registry agent 为 null → 视为 Active）与 `updatedAt`（registry `agents.updated_at`，用于 Updated 排序）
- KPI（含 Agents / Messages）仍按 workspace 全量（含归档）统计；筛选只影响 Agents 列表

## 4. 验收

- [ ] 无 Activity 页标题；分支名与 chips 同字体、同一行对齐；KPI 更紧凑且仅 Shell / File reads / File writes / Messages（实现完成，待真机视觉验收）
- [ ] 默认只列 Active；切到 Archived 列归档 agent；归档行不可点开（实现完成，待真机验收）
- [ ] 默认显示 Skills；点标题右侧图标切到 MCP（实现完成，待真机验收）
- [ ] 设置菜单：点图标在标题下方展开**悬浮**卡片（不挤压 Agents 列表；点卡片外 / 再点图标收起），Sort / Group / Show 可切换（子页选中后返回 root）（实现完成，待真机验收）
- [ ] Sort 支持 Created / Updated / Name / Messages / Status；Status 下 attention（permission / error / running）置顶（实现完成，待真机验收）
- [ ] Command Center「Workspace Activity」可在 Explorer 打开该面板（实现完成，待真机验收）
- [x] `npm test` / typecheck / reload
