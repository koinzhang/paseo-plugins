# Specs index — Activity

产品名 / 插件 ID / 数据目录：**Activity** / **`activity`** / `~/.paseo/plugin-data/activity/`  
（原 id `tool-usage`；升级时自动迁移，见 [007-rename-activity](./007-rename-activity/) Phase 2。）

**架构总览（Global / Workspace / Agent）**：[docs/architecture.md](../docs/architecture.md)

按编号增量演进；**不要往已关闭的目录里堆新需求**。实现前先改对应 `spec.md` / `plan.md`。

## 数据维度（正交）

| 维度 | 计量 | 持久化 | Spec |
|---|---|---|---|
| Tools | skill / MCP / shell 调用 | `tool_calls` | 001（+002/003/004 UI） |
| Agents | agent **创建**（及归档元数据） | `agents` | 005（004 热力图口径） |
| Messages | 用户 **发送** 的对话次数 | `user_messages`（006） | **006** |
| Models | 发送时 model（messages 加权） | `user_messages.model`（015） | **015** |

三者（tools / agents / messages）互不替代：有创建无消息、有消息无 skill、有 skill 的 agent 均可独立为 0。Model 挂在 messages 上，不是第四正交事件流。

**存储原则（跨维度）**：事件落本地 SQLite（`~/.paseo/plugin-data/activity/usage.db`）；Paseo timeline / `agents.list` 只作采集与回填源，**不在 UI 查询路径上全量现算**。

## 目录

| 目录 | 状态 | 内容 |
|---|---|---|
| [001-usage-tracking](./001-usage-tracking/) | 已实现 | 工具采集、RPC、pill/panel、全局 by-provider |
| [002-activity-heatmap](./002-activity-heatmap/) | 已实现 | 按天 skill/MCP 热力图 |
| [003-usage-visual-refresh](./003-usage-visual-refresh/) | 已实现 | ChatGPT activity 视觉对齐 |
| [004-heatmap-agents](./004-heatmap-agents/) | 已实现 | 热力图 agents 字段（口径见 005） |
| [005-agent-registry](./005-agent-registry/) | 已实现 | 凡创建即计入的 agent 注册表 |
| [006-user-messages](./006-user-messages/) | 已实现，待真机验收 | 用户发送对话次数 |
| [007-rename-activity](./007-rename-activity/) | Phase 1+2 完成 | 产品名 Activity；插件 ID `activity` |
| [008-silent-backfill](./008-silent-backfill/) | 已实现 | 静默历史补扫 |
| [009-fast-loading](./009-fast-loading/) | 已实现 | 本地查询与 Pill/Popover 缓存复用 |
| [010-activity-insights](./010-activity-insights/) | 已实现 | Insights 改为分布/习惯解读；streak 含 messages/agents |
| [011-kpi-workspaces](./011-kpi-workspaces/) | 已实现 | KPI Total calls → Workspaces（agents 去重 workspace） |
| [012-review-remediation](./012-review-remediation/) | 已实现 | 消化 `docs/reviews/2026-09-19-code-review.md` |
| [013-pill-modal](./013-pill-modal/) | 已回滚 | 双层 popover 判定为宿主缺陷；记录排查与结论，插件侧不绕行 |
| [014-shell-file-ops](./014-shell-file-ops/) | 已实现 | Shell / File reads·writes KPI；互斥口径（low-skill 不计 Shell） |
| [015-model-usage](./015-model-usage/) | 已实现 | user_message 打 model 戳；Most used models / Top model |
| [016-provider-filter-limit](./016-provider-filter-limit/) | 已实现 | Provider 筛选栏最多 5 个，按 agent / message 数排名 |
| [017-insights-reorder](./017-insights-reorder/) | 已实现 | 恢复 Top provider；去掉 Tools per message；日历→偏好→结构重排 |
| [018-coding-vs-chat-agents](./018-coding-vs-chat-agents/) | 已实现 | Coding vs chat 按 agent 会话二分；空会话排除 |
| [019-coding-mutating-ops](./019-coding-mutating-ops/) | 已实现 | Coding = 写/改文件或写盘 shell（白名单启发式） |
| [020-heatmap-title](./020-heatmap-title/) | 已实现 | 热力图标题 Tool activity → Activity |
| [021-heatmap-range-layout](./021-heatmap-range-layout/) | 已实现 | Today/7D/30D 热力图与 All 同用 52 周年窗布局 |
| [022-remove-export-command](./022-remove-export-command/) | 已实现 | 移除 Command Center「Export activity report」入口 |
| [023-command-center-titles](./023-command-center-titles/) | 已实现 | Command Center 项改名 All Activity / Current Activity |
| [024-explorer-workspace-activity](./024-explorer-workspace-activity/) | 已实现 | Explorer workspace Activity 面板（per-agent 聚合） |
| [025-explorer-panel-polish](./025-explorer-panel-polish/) | 已实现 | Explorer 面板：表头一行 / dense KPI / Active·Archived agent 筛选 |
| [026-agent-archive-actions](./026-agent-archive-actions/) | 已实现 | Explorer Agents 行归档 / 反归档按钮 |
| [027-explorer-drop-header](./027-explorer-drop-header/) | 已实现 | Explorer 去掉分支名与时间 chips |
| [028-explorer-display-settings](./028-explorer-display-settings/) | 已实现 | Explorer Agents 显示偏好 host settings 持久化 |
| [027-agent-activity-title](./027-agent-activity-title/) | 已实现 | Command Center 项改名 Current Activity → Agent Activity |
| [029-explorer-agent-search](./029-explorer-agent-search/) | 已实现 | Explorer Agents 按标题搜索（图标展开输入框） |
| [030-command-center-activity-title](./030-command-center-activity-title/) | 已实现 | Command Center 项改名 All Activity → Activity |
| [031-scope-architecture-remediation](./031-scope-architecture-remediation/) | 已实现 | 架构文档；拆分 workspace panel；agents 翻页；Agent Messages KPI |
| [032-terminals-section](./032-terminals-section/) | 已实现 | Workspace 面板 Terminals 区块：host SDK 只读列出 + 展开输出预览 |
| [033-agent-permission-badge](./033-agent-permission-badge/) | 已实现 | Agents 行 pending permission warning 徽标；attention 排序含 pendingPermissions |
| [034-agent-attention-colors](./034-agent-attention-colors/) | 已实现 | Agents 行机器人图标：finished→statusSuccess、permission→statusWarning、error→statusDanger |
| [035-agent-status-subscription](./035-agent-status-subscription/) | 已实现（038 修正） | 目录事件增量更新状态缓存，15s 轮询保证完整性 |
| [036-agent-running-spinner](./036-agent-running-spinner/) | 已实现 | Agents 行 running 状态：图标右下角 host 风格环形 loading |
| [037-turn-end-refresh](./037-turn-end-refresh/) | 已实现（038 修正） | Agent/pill 真实 timeline turn 刷新；Workspace 启发式提示 + 轮询 |
| [038-sdk-api-remediation](./038-sdk-api-remediation/) | 已实现 | SDK 审查修复：分页轮询、placement 项目过滤（已修正回归）、timeline 事件、skill cwd 恢复 |
| [039-unified-activity-time](./039-unified-activity-time/) | 已实现 | UI 时间统一 `FormattedTime` / `formatActivityTime`（app lang + locale） |
| [040-composer-attention-pill](./040-composer-attention-pill/) | 已实现（待真机） | Composer attention pill：同 workspace 非当前 finished/permission 捷径 |
| [041-agent-subagent-badge](./041-agent-subagent-badge/) | 已实现（待真机） | Explorer Agents 图标右下角：子 agent 数量；running loading 优先 |
| [042-show-prompt](./042-show-prompt/) | 已实现（待真机） | Show → Prompt：行 meta 展示最新用户消息预览 |
| [043-live-closed-status](./043-live-closed-status/) | 已实现（待真机） | Explorer：useAgent 近实时 Closed；remove 不丢 lifecycle |
| [044-paseo-0.9-adaptation](./044-paseo-0.9-adaptation/) | 已实现 | 适配 Paseo 0.9 SDK / timeline；目录契约由 047 修正 |
| [045-closed-against-stale-details](./045-closed-against-stale-details/) | 已由 047 替代 | Closed 使用明确目录状态，不再从宿主缓存推断 |
| [046-host-archive-optimistic](./046-host-archive-optimistic/) | 已由 047 替代 | 使用明确 archivedAt 实时更新 Active/Archived |
| [047-beta2-observation-remediation](./047-beta2-observation-remediation/) | 已实现，页面验收待完成 | 独立目录订阅、明确生命周期/归档、清理与 SDK 契约测试 |

## 约定

每个编号目录通常含：

| 文件 | 作用 |
|---|---|
| `spec.md` | WHAT：目标 / 非目标 / 行为 / 验收 |
| `plan.md` | HOW：架构、采集、模型、UI 接线 |
| `tasks.md` | 任务与验证勾选 |
| `research.md` | 源码依据与开放问题（按需） |
| `contracts/` | schema / RPC 草稿（zod 为运行时真相源） |
