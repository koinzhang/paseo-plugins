# 025 — Explorer 面板细节（表头 / KPI / agent 筛选）

- 状态：已实现
- 日期：2026-09-19
- 依赖：024（Explorer workspace Activity）

## 1. 目标

| ID | 目标 |
|---|---|
| G1 | 面板内不再显示 Activity 页标题；左侧只显示分支/workspace 名（字体与时间 chips 一致：14 / 500 / muted），与右侧时间 chips 同一行、底部（基线）对齐；窄宽度允许换行；chips 与全局 Activity 页 TextTabs 同款：无下划线，仅颜色/字重区分选中 |
| G2 | KPI 栏用 dense 尺寸（`UsageStats` 新增可选 `dense`）：更小的数值 / 标签 / 内边距；指标只保留 **Shell calls / File reads / File writes / Messages**（不含 skill / MCP / agents） |
| G3 | Agents 区默认按 **创建时间倒序**；标题右侧设置图标展开**悬浮菜单**（absolute；点卡片外关闭）；视觉与交互对齐宿主侧边栏 `SidebarDisplayPreferencesMenu`：一级 `MenuSurface` 常驻，点/悬停行打开**左侧二级 flyout**（overlap 5）；232 宽、8 圆角、`border`、md 阴影、行 inset hover chip；互斥选项选中后关闭整菜单，Show / Status / Lifecycle 开关不关闭 |
| G4 | Skills / MCP 合并为一个排行区：默认 **Skills**，点标题右侧图标切到 **MCP**（同全局 Activity 的 rank 图标切换；标题保持 Skills / MCP，不用 "Most used" 前缀），不再上下堆叠 |
| G5 | **Sort**：Created（默认，创建时间倒序）/ Updated（更新时间倒序）/ Name（字典序）/ Messages（消息数倒序）/ Status（值得关注的状态置顶） |
| G6 | **Group**：None（默认）/ Provider（按 provider 分组，组标题为 providerLabel） |
| G7 | **Show**：多选开关，控制 agent 行副文案是否显示 **Provider / Calls / Messages / Updated**（默认前三项开）；Updated 用 app 语言（默认 `en`）+ 当地格式：同年月日+时间，跨年带年份；无勾选项时不渲染副文案行；不显示行尾活动量数字 |
| G8 | Sort=Status 时的排序数据来自客户端 `paseo.agents.list`（`includeArchived`，15s 轮询）：rank = attention（`requiresAttention` / `permission` / `error`）0 → running 1 → idle 2 → initializing 3 → closed/unknown 4；同级按 Updated 降序 |
| G9 | workspace 级 Command Center「Workspace Activity」→ `openPanel("workspace-activity", { location: "explorer" })`；Explorer 面板本身由宿主管理（无法默认展示，需手动添加一次），此项提供 ⌘K 快捷打开 |
| G10 | **Status**（多选）：Active（默认开）/ Archived（默认关）。控制是否列出未归档 / 归档 agent |
| G11 | **Lifecycle**（多选，默认全选）：Idle / Running / Error / Closed。只作用于 Active（未归档）agent；`closed` ≠ 归档。归档行不提供打开会话链接；行首图标用 `BotOff`（机器+斜线），未归档仍用 `Bot` |
| G12 | 点 Agents 筛选图标或 Skills/MCP 切换时 Explorer 不晃动：面板 ScrollView **始终隐藏滚动条**（`showsVerticalScrollIndicator={false}` + web `scrollbarWidth: none`），避免槽宽显隐；内容区 flex/`overflow` 约束 + 菜单 fixed；排行区 `minHeight` |

## 2. 非目标

- 不改 KPI 指标集合与查询口径
- 不改全局 surface / agent panel 的 `UsageStats`（仅新增可选 `dense`）

## 3. 口径

- `usage.agents` 输出新增 `archivedAt`（registry `agents.archived_at`；非 registry agent 为 null → 视为 Active）与 `updatedAt`（registry `agents.updated_at`，用于 Updated 排序）
- KPI（含 Agents / Messages）仍按 workspace 全量（含归档）统计；筛选只影响 Agents 列表
- 行尾不再显示活动量数字；Show → Updated 使用 `formatUpdatedAt(iso, appLocale)`（app 语言默认 en；同年月日+时间，跨年带年份）
- `closed` 与归档无关：见 G10

## 4. 验收

- [ ] 无 Activity 页标题；分支名与 chips 同字体、同一行对齐；KPI 更紧凑且仅 Shell / File reads / File writes / Messages（实现完成，待真机视觉验收）
- [ ] Status 默认 Active、Archived 默认不选；Lifecycle 默认全选 Idle/Running/Error/Closed；均可多选；归档行不可点开（实现完成，待真机验收）
- [ ] Show 可独立开关 Provider / Calls / Messages / Updated；Updated 跟 app 语言与当地格式；关净后无副文案；无行尾数字（实现完成，待真机验收）
- [ ] 默认显示 Skills；点标题右侧图标切到 MCP（实现完成，待真机验收）
- [ ] 设置菜单：点图标展开一级悬浮卡片；点/悬停 Sort / Group / Show / Status / Lifecycle 打开**二级 flyout**；互斥选项选中后关闭整菜单；Show / Status / Lifecycle 开关保持打开；点卡片外 / 再点图标收起（实现完成，待真机验收）
- [ ] Sort 支持 Created / Updated / Name / Messages / Status；Status 下 attention（permission / error / running）置顶（实现完成，待真机验收）
- [ ] Command Center「Workspace Activity」可在 Explorer 打开该面板（实现完成，待真机验收）
- [ ] 点筛选图标 / Skills↔MCP 切换时 Explorer 不晃动（实现完成，待真机验收）
- [x] `npm test` / typecheck / reload
