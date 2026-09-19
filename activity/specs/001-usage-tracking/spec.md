# 001 — 工具使用统计（Activity / id: activity）

- 状态：M1–M5 已实现（M4：侧边栏全局视图 · 按 provider；M5：pill 空数据隐藏、面板内 SKILL.md 阅读器）
- 日期：2026-09-18
- 关联文档：plan.md / tasks.md / research.md / contracts/
- **产品名**：用户可见为 **Activity**；插件 ID **`activity`**（原 `tool-usage`，见 [007-rename-activity](../007-rename-activity/)）

## 1. 背景与问题

Paseo 把所有 provider 的工具调用统一规范化为 timeline 的 `tool_call` item，但没有任何地方回答：

- 哪些 skill 真的被用过？用了多少次？谁在用？
- MCP tool 调用了多少次？失败率多少？
- 执行过多少条 shell 命令？top 命令是什么？
- **各 provider（Claude / OpenCode / Codex / …）整体用量如何对比？**

## 2. 目标（v1）

| ID | 目标 |
|---|---|
| G1 | 自动采集所有 agent 的工具调用，无需用户操作 |
| G2 | 分类：skill（exact / inferred / low 三档置信度）、MCP、shell、其他工具 |
| G3 | 本地持久化，daemon 重启后数据保留 |
| G4 | **Composer 指标条**：在输入框上方以 **单个 pill** 展示 **当前会话（本 agent）** 的 skill / MCP 指标（无数据时隐藏），点击进入本 agent 详情 |
| G5 | 支持历史回填（补插件启用前的数据） |
| G6 | 导出 markdown 使用报告 |
| G8 | **侧边栏「Activity」**（原称 Tool Usage）：查看 **全部** 已采集 usage（不限当前 agent），并 **按 provider 分区/分组** |

## 3. 非目标（v1 不做）

| ID | 非目标 | 说明 |
|---|---|---|
| NG1 | 实时逐事件流 UI | turn 粒度已满足统计需求；pill 在 turn 结束后刷新即可 |
| NG2 | ACP（Cursor / CodeBuddy）精确 skill 归类 | 只做 inferred/low，详情分档展示 |
| NG3 | 跨 daemon / 多机聚合 | 数据留在单 daemon 本地 |
| NG4 | 修改 agent 行为 / 配置 / 权限 | 只读统计，不注入 prompt、不拦截权限 |
| NG5 | 绝对精确的时间戳 | live 数据用入库时间近似；回填时补精确值 |
| NG6 | greeting 模板 UI | 脚手架 greeting 已删除，不再恢复 |
| NG7 | 多个 composer pill（shell / skill / mcp 分 pill） | 指标合并在 **一个** pill 内 |
| NG8 | 侧边栏内再拆多个入口 | 全局视图只保留一个「Activity」sidebar item |
| NG9 | 「已加载但未使用」skill 清单 | `commands()` 在 Cursor/ACP 不可靠；已移除 RPC 与 UI |
| NG10 | Shell 明细 UI（panel / 全局分区） | v1 UI 只展示 skill / MCP；shell 仅进导出报告与库内统计，采集不受影响。**部分撤销**：见 [014-shell-file-ops](../014-shell-file-ops/)（Shell / File KPI + Top shell；互斥口径） |

## 4. 用户故事与验收标准

### US-1 在输入框上方看到合并指标
作为用户，我想在 composer 输入框上方一眼看到当前 agent 的工具使用概况。

- Given 当前 agent 已采集到 skill / MCP 调用
- When 打开该 agent 的对话页
- Then 有数据时 composer 轨道上出现 **一个** pill（样式对齐 skills 扩展：图标 + 动态 label）；无数据时 pill 隐藏（无占位图标）
- And label **仅含当前 agent 会话** 最近调用的 **一个 skill 或 MCP**（展示美化名，**不带次数**；平票时 skill 优先，再按名排序）
- And 若 skill + MCP **实体数**合计 > 1，label 为 `Name + N`（N = 实体总数 − 1）
- And 查询未完成前显示 `Usage` 标题占位（保持 icon 挂载），查询完成后按结果决定显示 / 隐藏，避免闪 `0`
- And turn 进行中若曾因空结果隐藏，turn 结束后（agent idle）仍须能再次出现（不得因 `visible:false` 卸掉 icon 后永久失联）
- And 查询失败时保持 `Usage` 可见（不出现宿主错误态），仍可点击打开 panel
- And pill **不**展示其他 agent / 全局汇总（全局走侧边栏 Activity）
- And 打开详情后仅展示有数据的 Skills / MCP 分区（按名列出调用次数；无总览 tab；无调用则不展示对应分区）


### US-2 从 pill 打开本 agent 详情
作为用户，我想点击 pill 查看当前 agent 的分项统计。

- Given pill 已显示
- When 点击 pill
- Then 在 composer 上方打开 **popover**（宽屏锚定浮层；compact 为底部 sheet），展示本 agent 的 Skills / MCP
  - 已知宿主缺陷：重挂时可能留下左上角幽灵层；不在插件侧绕行，见 [013](../013-pill-modal/)
- And 每行行首带类型图标（skill = `Sparkles`，MCP = `Plug`）；无分区标题行，无 resync / export 按钮（完整操作仍在 panel / Command Center）
- And Command Center「Activity」仍可打开 agent workspace panel（完整详情 / SKILL.md）

### US-3 查看 skill 使用情况（按 skill 名）
作为用户，我想知道每个 skill 被调用的次数与置信档位。

- Given 某会话中 Claude 调用了 `Skill` 工具、Pi 读取了 `SKILL.md`
- When 在详情 Skills 区查看
- Then 按 skill 名聚合展示调用次数 `total`（= exact + inferred；low 不计入）与最近使用时间
- And exact / inferred / low 分档计数在导出报告（markdown）中分列展示

### US-4 查看 MCP 使用情况
作为用户，我想按 server / tool 维度看 MCP 调用次数与失败率。

- Given agent 调用了 `mcp__knot__tapd_search`（Claude）
- When 在详情 MCP 区查看
- Then 显示 server=knot、tool=tapd_search、次数与失败状态

### US-5 查看 shell 命令统计
作为用户，我想知道执行了多少条命令、top 命令是什么。

- Given 采集到多条 `detail.type === "shell"` 的 tool_call
- When 通过 Command Center「Export activity report」导出
- Then 报告（剪贴板 markdown）含 shell 总次数、失败数、按首词归并的 top 命令
- And v1 面板 / 全局 UI 不展示 shell 分区（数据仍入库，见 NG10）

### US-7 回填历史
作为用户，我想补采插件启用前的历史数据。

- Given 某 agent 有历史 timeline
- When 插件后台静默回填运行（见 **008-silent-backfill**；不再提供 Command Center 手动「重扫」入口）
- Then 历史 tool_call 入库，重复执行不产生重复记录

### US-8 导出报告
作为用户，我想导出 markdown 报告用于周回顾。

- Given Command Center 可触发「Export activity report」（panel 不再提供导出按钮）
- When 执行该命令
- Then markdown 写入系统剪贴板，数字与详情 / pill 一致

### US-9 侧边栏查看全部 usage（按 provider）
作为用户，我想从侧边栏打开「Activity」，看到 **全部 agent** 的用量，并按 **provider** 区分。

- Given 库中已有来自多个 provider 的 tool_call（如 claude、opencode、codex、cursor）
- When 点击侧边栏 **Activity**
- Then 打开全局 surface（不绑定单个 agent）
- And 页面顶部展示时间范围内 **调用量 Top 5 skill**（按 skill 名跨 agent 合计）
- And 页面按 **规范化 provider** 分组展示（`claude` / `opencode` / `codex` / `pi` / `cursor` / …；`claude/opus` 归入 `claude`）
- And 全局页不展示「Activity」/「Tool Usage」大标题
- And 每个 provider 区块至少显示：agent 数，以及 **按 skill 名**、**按 MCP server.tool** 聚合的调用次数（不只显示类别总数）；不展示 shell（见 NG10）
- And 数字与 `usage.skills-by-name` / `usage.mcp-by-tool`（或 by-provider 内嵌列表）一致
- And 支持时间范围（今天 / 7 天 / 30 天 / 全部）与 **provider 分段筛选**（样式同时间芯片；默认 All）
- And **Provider 筛选项**列出库中凡有 **agent 创建 / skill·MCP·shell 调用 / user message** 任一数据的规范化 provider（**不随时间窗收缩**）；KPI / 热力图 / 排行仍按当前时间窗 + 选中 provider 过滤；窗内无活动时显示 0，不把该芯片从筛选项移除
- And **不**展示「All agents · grouped by provider」等说明文案
- And **不**要求按当前选中 agent 过滤（这是「全部」视图；本 agent 视图仍走 pill → agent panel）

## 5. 全局验收标准

- **幂等**：同一 `agentId + callId` 重复上报只计一次（流式 running → completed 保留最终 status）
- **不干扰**：hook 异常只记日志，不影响 agent turn
- **性能**：hook handler 线性扫描 + 增量写；pill 仅对当前可见 agent 拉 summary；侧边栏全局视图一次聚合查询即可
- **持久**：daemon 重启、插件 reload 后数据仍在
- **质量**：`npm run typecheck` 通过；采集/分类/聚合逻辑有单测
- **入口**：
  - 本 agent：composer pill + agent workspace panel + Command Center
  - **全部 + 按 provider**：侧边栏 **Activity** surface（`addSurface` + `addSidebarItem`；id `activity`）
  - 无 greeting 模板

## 6. 术语

| 术语 | 含义 |
|---|---|
| exact | provider 明确以 skill 工具调用暴露（Claude `Skill` / OpenCode `skill`） |
| inferred | 通过读取技能根目录下 `SKILL.md` 推断（读文件 ≠ 一定调用，故降档） |
| low | 通过 shell 命令（cat/sed/grep SKILL.md）推断，仅参考；**不计入** skill 调用次数（`total` = exact + inferred） |
| tool_call | Paseo timeline 统一后的工具调用 item（`type: "tool_call"`） |
| canonical projection | `timeline.refetch` 的原始投影，含精确 `timestamp / turnId / seqStart` |
| composer pill | `client.addComposerPill` 注册的输入框上方轨道按钮；仅有 skill / MCP 数据时可见 |
| skillPath | SKILL.md 路径：采集自 `file_path`；缺失时按名补全（本 agent 含项目 skill 根，全局仅 home）；RPC 返回时 `homeDir` 折叠为 `~` |
| SKILL.md 阅读器 | agent usage panel 内点击 skill 名后展示 SKILL.md 正文的只读视图 |
| normalized provider | 将 `tool_calls.provider`（如 `claude/opus`、`codebuddy-code`）归一为 `claude` / `opencode` / `codex` / `pi` / `cursor` / `codebuddy` / 其它 head |
| 全局 Activity | 侧边栏 surface（产品名 Activity；插件 id 见 007），展示全部采集数据并按 normalized provider 分组 |
