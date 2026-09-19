# Specs index — Activity

产品名 / 插件 ID / 数据目录：**Activity** / **`activity`** / `~/.paseo/plugin-data/activity/`  
（原 id `tool-usage`；升级时自动迁移，见 [007-rename-activity](./007-rename-activity/) Phase 2。）

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

## 约定

每个编号目录通常含：

| 文件 | 作用 |
|---|---|
| `spec.md` | WHAT：目标 / 非目标 / 行为 / 验收 |
| `plan.md` | HOW：架构、采集、模型、UI 接线 |
| `tasks.md` | 任务与验证勾选 |
| `research.md` | 源码依据与开放问题（按需） |
| `contracts/` | schema / RPC 草稿（zod 为运行时真相源） |
