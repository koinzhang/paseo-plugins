# Specs index — Activity

产品名 / 插件 ID / 数据目录：**Activity** / **`activity`** / `~/.paseo/plugin-data/activity/`  
（原 id `tool-usage`；升级时自动迁移，见 [007-rename-activity](./007-rename-activity/) Phase 2。）

**架构总览（Global / Workspace / Agent）**：[docs/architecture.md](../docs/architecture.md)  
**设计规范（字体 / 间距 / 圆角 / 图标 / 状态）**：[docs/design-system.md](../docs/design-system.md) — 旧 spec 中的视觉数值以它为准（065）

按编号增量演进；**不要往已关闭的目录里堆新需求**。实现前先改对应 `spec.md` / `plan.md`。

## 数据维度（正交）

| 维度 | 计量 | 持久化 | Spec |
|---|---|---|---|
| Tools | skill / MCP / shell 调用 | `tool_calls` | 001（+002/003/004 UI） |
| Agents | agent **创建**（及归档元数据） | `agents` | 005（004 热力图口径） |
| Prompts（Messages） | 用户 **发送** 的对话次数（070 起 UI 统称 Prompts） | `user_messages`（006） | **006** |
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
| [016-provider-filter-limit](./016-provider-filter-limit/) | 已实现（069 取消上限） | Provider 筛选栏最多 5 个，按 agent / message 数排名 |
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

| [048-heatmap-rolling-rectangle](./048-heatmap-rolling-rectangle/) | 已由 058 替代 | 热力图固定 364 天完整矩形，今天始终在右下角 |
| [049-agent-lifetime-creations](./049-agent-lifetime-creations/) | 已实现（050 / 051 修订） | 归档 agent 元数据补扫（`includeArchived`）；最长寿命 RPC；每日创建直方图 |
| [050-kpi-insights-reorg](./050-kpi-insights-reorg/) | 已实现（051 修订直方图与最长寿命口径） | Global KPI 优先 Top / Longest（6 格）；Insights 固定 8 行；直方图固定 30 天窗口 |
| [051-creations-provider-stack](./051-creations-provider-stack/) | 已实现，页面验收待完成 | 创建直方图按 provider 堆叠 + 浮层明细（`usage.agent-creations`）；最长寿命含活跃 agent |
| [052-kpi-text-fit](./052-kpi-text-fit/) | 已实现 | KPI 数值 / 标签自适应缩小，永不换行（隐藏副本测量 + 单次推导字号） |
| [053-kpi-and-bar-polish](./053-kpi-and-bar-polish/) | 已实现 | KPI Top provider / Top model 只显示名称；堆叠柱仅顶部一段带上圆角 |
| [054-kpi-insights-swap](./054-kpi-insights-swap/) | 已实现 | KPI `Workspaces` ↔ Insights `Peak weekday` 互换 |
| [055-creations-day-gradient](./055-creations-day-gradient/) | 已实现（柱色由 057 取代） | 创建直方图日柱改为整块填充（原 provider 软渐变；形状保留） |
| [056-creations-tooltip-nonzero](./056-creations-tooltip-nonzero/) | 已实现 | 创建直方图浮层只列当日有创建的 provider（省略 count 0） |
| [057-creations-accent-bars](./057-creations-accent-bars/) | 已实现，页面验收待完成 | 创建直方图日柱改用主题 accent 强度色（与热力图同色系）；浮层保留 provider 品牌色 |
| [058-heatmap-weekday-rows](./058-heatmap-weekday-rows/) | 已实现，页面验收待完成 | 热力图行 = weekday（周日起）、列 = 自然周（Codex 样式）；修订 048 |
| [059-hourly-activity-timeline](./059-hourly-activity-timeline/) | 已实现，页面验收待完成 | 最近 168 小时活动时间线；发散折线面积图（轴上 messages / 轴下 agents）、一屏 24 小时、按住拖拽平移、独立于 range chips |
| [060-global-section-spacing](./060-global-section-spacing/) | 已实现，页面验收待完成 | Global 各 section 间距节奏统一：热力图尾部留白、Timeline 内部 gap、insights / 排行标题 10 / 12 |
| [061-heatmap-tab-font-size](./061-heatmap-tab-font-size/) | 已实现，页面验收待完成 | 热力图 Daily / Weekly / Cumulative 与横轴月份标签同字号（`LABEL_FONT_SIZE` 12） |
| [062-measured-width-cache](./062-measured-width-cache/) | 已实现，页面验收待完成 | 测量宽度：0 宽不上报、同步测 DOM、监听 resize / visibilitychange；隐藏窗口与切页面不再重排 |
| [063-workspace-skill-timeline](./063-workspace-skill-timeline/) | 已实现，页面验收待完成 | Workspace Skills / MCP 新增逐次调用时间线，共用持久化视图 |
| [064-review-hardening](./064-review-hardening/) | 已实现 | 审查修复：read-skill 符号链接、unarchive 参数、读 RPC 缓存与 SQL 下推、目录 hint 多余刷新、增量历史扫描、SQLite busy timeout / WAL |
| [065-design-tokens](./065-design-tokens/) | 已实现，页面验收待完成 | 设计规范统一：`client/design-tokens.ts` + `docs/design-system.md`；三层 scope 与 popover 同角色同值；测试拦截裸样式数值 |
| [066-shared-ui-i18n](./066-shared-ui-i18n/) | 已实现，页面验收待完成 | 公共组件 `client/ui.tsx`；三图统一浮动 `ChartTooltip`（Timeline 去 readout）；文案随 Paseo app 语言（en / zh-CN）；两 popover 宽度统一 |
| [067-workspace-header-button](./067-workspace-header-button/) | 已实现，页面验收待完成 | 每个 workspace header 增加 Activity 图标按钮，点击在 Explorer 打开 Workspace Activity；面板挂载时隐藏，宿主 tab 缓存上限见 plan |
| [068-workspace-panel-background](./068-workspace-panel-background/) | 已实现，页面验收待完成 | Workspace Activity 面板透出 Explorer 底色，与 Files、Changes 一致 |
| [069-global-sessions-refresh](./069-global-sessions-refresh/) | 已实现，页面验收待完成 | Global：会话统称 Sessions；移除 range chips；`Provider: All ▾` 下拉列全部 provider；KPI 重构（占比 / Active days）；热力图隐藏模式切换；新增 Providers 排行 |
| [070-metric-switch-projects](./070-metric-switch-projects/) | 已实现，页面验收待完成 | KPI 5 格（去 Longest streak）；热力图 / 30 天直方图 / Timeline 右上角 Sessions·Prompts·Skill·MCP 切换；Messages → Prompts；Providers 下方 Projects 排行（`usage.by-project`，agents 记录 cwd / project_root） |
| [071-omp-provider-split](./071-omp-provider-split/) | 已实现，页面验收待完成 | Oh My Pi（`omp`）不再并入 Pi，所有视图独立统计；删除 `brandProviderId` |
| [072-insights-habits](./072-insights-habits/) | 已实现，页面验收待完成 | Insights 8 行重排（Active days、Longest streak、多轮会话占比、平均会话投入时长等）；`usage.agent-lifetime` 加 `averageEngagedMs` / 多轮会话计数 |
| [073-global-kpi-comparison](./073-global-kpi-comparison/) | 已实现，页面验收待完成 | Global 四格 KPI 增加相邻 7 日对比；Top provider / model 显示上一窗口榜首名称 |
| [074-timestamp-preservation](./074-timestamp-preservation/) | 已实现 | 重扫不再用回放时间覆盖事件时间：取更早且不晚于首次入库；启动时修复存量 |
| [075-prompt-replay-dedupe](./075-prompt-replay-dedupe/) | 已实现 | 同一 prompt 的实时行与回放行（provider ID / `canonical:`）去重，保留实时行 |
| [076-global-chart-titles](./076-global-chart-titles/) | 已实现 | Global 三张图标题统一为 Activity Calendar / Daily Activity / Hourly Activity |
| [077-provider-filter-align-right](./077-provider-filter-align-right/) | 已实现 | Global provider 筛选栏右对齐；下拉菜单与触发器右对齐向左展开 |
| [078-ranking-collapse](./078-ranking-collapse/) | 已实现 | Global Providers / Projects 排行默认最多显示 5 条，右侧支持展开与收起 |
| [079-hourly-line-joins](./079-hourly-line-joins/) | 进行中 | 修复 Hourly Activity 折线交点的毛刺 |
| [080-insights-streak-weekday-reorder](./080-insights-streak-weekday-reorder/) | 已实现 | Insights：Longest streak / Peak weekday 前移到第 3、4 位（Workspaces 上方） |
| [081-ranking-bar-animation](./081-ranking-bar-animation/) | 已实现，页面验收待完成 | Global 图表动画：排行条与 Daily Activity 柱从 0 增长、切换时平滑过渡；Activity Calendar 按周列扫入 |
## 约定

每个编号目录通常含：

| 文件 | 作用 |
|---|---|
| `spec.md` | WHAT：目标 / 非目标 / 行为 / 验收 |
| `plan.md` | HOW：架构、采集、模型、UI 接线 |
| `tasks.md` | 任务与验证勾选 |
| `research.md` | 源码依据与开放问题（按需） |
| `contracts/` | schema / RPC 草稿（zod 为运行时真相源） |

## 上游源码版本锚点

插件 API 结论以**上游源码 + 已安装运行时**为依据，不以 `main` HEAD 为准（HEAD 常领先于已发布契约）。

- 刷新本地只读参考 checkout：`./scripts/sync-paseo.sh`（同级 `../paseo`，fetch + fast-forward；`--clone` 首次浅克隆）
- 仓库**不引入 git submodule**：jj 不支持，submodule 内容不会出现在工作副本里，等于查不到源码
- 凡 `research.md` 中「已验证」的 API / 契约结论，同时记录锚点——上游 commit + 当时 `paseo --version`（脚本末尾输出可复制块）
- 锚点与运行时冲突时，以 `paseo-plugin.json` 的 `requirements.paseo` 与实机行为为准
- 脚本只在 checkout 正好等于 `origin/main` 时给出锚点；有本地提交 / 在其他分支时报错退出，避免把非上游 commit 当成依据
