# 070 — Global：KPI 5 格 / 图表指标切换 / Prompts 术语 / Projects 排行

## 背景

069 之后 KPI 仍有 6 格（含 Longest streak）；热力图、30 天直方图、Timeline 各自只看固定口径（四项合计 / 会话创建 / prompts+sessions 双向图），与 Providers 排行的 `‹ Sessions ›` 切换不一致。「Messages」实指用户发送的消息，易与 agent 回复混淆。缺少按项目的对比。

## 目标

1. **KPI 5 格**：删除 Longest streak，保留 Sessions · Prompts · Top provider · % · Top model · % · Active days。
2. **指标切换**：热力图、30 天直方图、Timeline 右上角统一 `‹ Sessions ›`，循环 Sessions → Prompts → Skill calls → MCP calls，**默认 Sessions**；各图独立。
   - 热力图：色阶按所选指标（此前按四项合计）。
   - 30 天直方图：标题改为 `Last 30 days`；Sessions 保留 provider 浮层明细；其他指标取 `usage.activity-by-day` 当日值，浮层只显示当日总数。
   - Timeline：单条面积图显示所选指标（此前轴上 messages / 轴下 agents）；浮层仍列四项，所选项带色点。
3. **术语**：所有 Activity 视图（Global / Workspace / Agent / composer popover）中表示用户发送消息的 Messages / 消息改为 **Prompts / 提示词**。Workspace「Show → Prompt」（最新一条预览）改为 `Latest prompt` / `最新提示词` 以区分计数。RPC 字段（`messageCount` 等）与设置值（sort / show 的 `messages`）不变。
4. **Projects 排行**：放在 Providers 下方，样式与 Providers 相同（色块 + 名称 + 比例条 + 数值 + 同一指标切换）；随 provider 下拉过滤。

## Project 归属

agent 无 project 字段，按以下顺序解析（`resolveAgentProjects`）：

1. 该 agent 所在 workspace 被列出时记录的 `projectRootPath`（覆盖 worktree）；
2. `cwd` 落在某个已知 project root 下（取最长前缀）；
3. 同一 Paseo worktree 目录（`…/worktrees/<hash>/…`）下已解析的其他 agent 的 project；
4. 非 worktree 的 `cwd` 本身（名称取 basename）；
5. 以上都没有 → `Other`。

名称取宿主 `projects.list()` 的 `projectDisplayName`，缺失时用 root basename。

## 非目标

- 不回填 Paseo 目录里已不存在的 agent 的 `cwd`（归 Other）。
- 不做 project 下拉筛选。

## 验收

- KPI 一行 5 格。
- 三张图与两张排行各自切换，默认 Sessions，数值与 KPI / Insights 同口径。
- 任何 Activity 视图中不再出现指代用户消息的 Messages / 消息。
- Projects 排行在本机数据上列出真实项目名，Other 仅含无 `cwd` 的会话。
