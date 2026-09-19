# 001 — 技术方案（plan）

> 关联：spec.md（WHAT）/ tasks.md（执行）/ research.md（源码依据）

## 1. 技术选型与项目结构

- 脚手架：`paseo plugin init`（已初始化），id = `tool-usage`，`requirements.paseo >= 0.8.0`
- 运行时划分：
  - `server/`：hooks、SQLite、回填、skill 路径解析（`skill-path.ts`）、RPC handler（有 Node 权限）
  - `shared/`：RPC 契约（zod）、分类规则常量与纯函数、本地时间格式化（`format.ts`）
  - `client/`：composer pill、agent panel（含 SKILL.md 阅读器）、侧边栏全局 Tool Usage surface、command center（无 greeting）
- 存储：优先 `node:sqlite`（Node 24 内置，零依赖）；不可用时退化为 JSONL + 启动建内存索引
- 数据目录（自定义约定，不写插件 checkout，避免 `paseo plugin update` 覆盖）：
  `~/.paseo/plugin-data/tool-usage/usage.db`

## 2. 数据源与约束

### 2.1 主采集：`server.on("agent.turn_ended")`

- `event.timeline` 是 `readonly AgentTimelineItem[]`，**全量快照（含之前所有对话）**
- 快照 item 无 `seq` / `timestamp` / `turnId`：
  - 用 `agentId + callId` 幂等去重
  - 时间用 `ingested_at` 近似
- 事件约束：best-effort、无重放/持久化/重试；handler 超时 30s；事件可并发、顺序不保证

### 2.2 回填 / 纠偏：`timeline.refetch()`

- `paseo.agents.ref(id).timeline.refetch({ projection: "canonical", direction, cursor, limit })`
- 返回 `entries[]`：`item`、`timestamp`、`turnId?`、`seqStart`、`seqEnd`、`sourceSeqRanges`、`collapsed`
- 分页：`epoch`、`startCursor` / `endCursor`（`{ epoch, seq }`）、`hasOlder` / `hasNewer`
- 增量游标 `epoch + last_seq` 存 `sync_state`
- 必须 `projection: "canonical"`（`projected` 会合并 tool lifecycle 等）

### 2.3 辅助：`agent.commands()`

- 返回会话实际加载的 commands / skills，每项 `kind: "skill" | "command"`
- 支持情况：Claude / OpenCode / Codex / Pi 可标 skill；Cursor / CodeBuddy（ACP）一律 command
- 当前实现未调用：path → skill 名由 `matchSkillFile` 直接按技能根匹配；`commands()` 调研结论保留备查（v2 若需按名补全再接线）

### 2.4 事件丢失兜底

1. 天然懒回填：下一次 `turn_ended` 全量快照自动补齐历史
2. 主动回填：Command Center「重扫全部历史」逐个 agent 走 2.2
3. 可选：插件启动时对所有 agent 做一次增量同步

## 3. 分类规则

### 3.1 Skill

| 档位 | 规则 | 覆盖 |
|---|---|---|
| exact | `name === "Skill"`（Claude）或 `name === "skill"`（OpenCode），取 `detail.label` | Claude、OpenCode |
| inferred | `detail.type === "read"` 且 `detail.filePath` 命中技能根目录下 `SKILL.md`，skill 名取父目录名 | Claude、OpenCode、Pi、Codex（模型自主加载） |
| low | `detail.type === "shell"` 且 `detail.command` 匹配 `(cat|sed|head|bat|grep|rg).*SKILL\.md` | Codex、Pi、ACP 兜底 |
| user-triggered（可选） | `user_message` 以 `/name` 或 `$name` 开头且 name 在 `commands()` skill 列表 | 未实现（待实测 timeline 原文） |

已知漏报（面板标注为「下限」）：

- Codex 用户触发 skill 时内容由 app-server 直接注入，模型通常不读文件
- Pi 用户 `/skill` 走 `skill_expansion` 注入文本，无 tool_call
- Cursor / CodeBuddy 是否上报文件读取由 agent 决定

误报抑制：

- 技能根目录白名单；编辑 skills 仓库的读取仍可能误报，靠分档展示与可选排除路径
- grep 命中、subagent 读取、同文件分块多次 read → 按 path 去重

### 3.2 技能根目录（inferred 匹配用，可配置）

覆盖常见 agent 配置目录（`AGENT_SKILL_CONFIG_DIRS` → `~/.{name}/skills` + 项目 `.{name}/skills`）：

- Claude / Codex / Cursor / OpenCode / Pi / CodeBuddy / Gemini / Windsurf / Continue / Copilot / Amp / Goose / Aider / Factory / Kilo / Roo / Cline / OpenClaw / TCodex / WorkBuddy / `.agents`
- 特例：`~/.config/opencode/skills`、`~/.pi/agent/skills`、`~/.codex/vendor_imports/skills`、`.github/skills`
- Paseo 插件：`~/.paseo/plugins/*/checkout/*/skills`、`~/.paseo/plugins/*/skills`（ingest 另有目录发现）

匹配 `<root>/…/<name>/SKILL.md`（允许分类嵌套，如 `.agents/skills/info/zhihu/SKILL.md` → `zhihu`）；目录名与 `commands()` 已知 skill 名对不上时仍记录，标 inferred。

面板阅读路径补全（`server/skill-path.ts`）：

- **本 agent**（`usage.skills-by-name` 带 `agentId`）：用 `buildSkillRoots(agent)`（含项目 `.{name}/skills` + home + 插件），按 `<root>/<name>/SKILL.md` 或 `<root>/<category>/<name>/SKILL.md` 解析 exact 调用等无 `file_path` 的项
- **全局**（`usage.by-provider`）：仍只用 `buildHomeSkillRoots`（不含项目相对根），避免跨 workspace 误读
- 返回给 UI 的 `skillPath` 一律把 `homeDir` 前缀折叠为 `~`（如 `~/.claude/skills/…`、`~/WorkSpace/…/.agents/skills/…`）；`usage.read-skill` 读取前再 `expandHomePath`
- 已采集到具体 `SKILL.md` 路径时优先保留（`preferSkillPath`），再折叠 `~`

### 3.3 MCP

| Provider | 命名规则 |
|---|---|
| Claude | `mcp__<server>__<tool>`（原始名透传） |
| Codex | `<server>.<tool>`（无需名单；`buildMcpToolName`） |
| Pi | `<server>.<tool>` |
| OpenCode | `<server>_<tool>`；ingest 时解析 server 名单后前缀匹配 |
| ACP（Cursor/CodeBuddy） | `name` 常为 kind（MCP 多为 `other`）；用 `metadata.title` / `detail.label` 做 inferred（`mcp__` / `s.t` / 名单前缀） |

OpenCode 名单来源（`server/mcp-servers.ts` → `resolveMcpServers`）：

1. Paseo 注入的 `paseo`（`~/.paseo/config.json` → `daemon.mcp.injectIntoAgents`，默认开启）
2. OpenCode 配置 `mcp` 键：`~/.config/opencode/opencode.json(c)`、项目 `opencode.json(c)` / `.opencode/opencode.json(c)`
3. Agent 持久化 `persistence.metadata.mcpServers` / `config.mcpServers`（`~/.paseo/agents/**/<id>.json`）

`usage.resync` 始终全量回扫（幂等 upsert），以便分类规则升级后纠偏历史行。

已知 Cursor 漏报：ACP 对 MCP 常上报 `kind=other` 且 `title` 为空/泛化（日志仅 `[Other]`），此时无法识别。

### 3.4 Shell 与其他工具

- shell：`detail.type === "shell"`，取 `command`、`cwd`、`exitCode`
- 其他：按 `detail.type` 归 kind（read / edit / write / search / fetch / sub_agent / plain_text / unknown）
- 兜底：`name` 本身作为工具名计数

## 4. 数据模型

见 `contracts/schema.sql`。核心表 `tool_calls`（`agent_id + call_id` 主键幂等）与 `sync_state`（回填游标）。聚合查询现算，不预存聚合表。

## 5. 采集流程（伪代码）

```ts
server.on("agent.turn_ended", async ({ agent, timeline }, { paseo }) => {
  const rows = [];
  for (const item of timeline) {
    if (item.type !== "tool_call") continue;
    const hit = classify(item, agent);       // shared/classify.ts
    if (hit) rows.push(toRow(item, hit, agent));
  }
  if (rows.length) await store.upsertMany(rows);  // ON CONFLICT 更新 status
});
```

```ts
async function resyncAgent(agentId: string, paseo: PaseoApi) {
  const state = await store.getSyncState(agentId);
  let cursor = state ? { epoch: state.epoch, seq: state.last_seq } : undefined;
  for (;;) {
    const page = await paseo.agents.ref(agentId).timeline.refetch({
      projection: "canonical",
      direction: cursor ? "after" : "tail",
      cursor,
      limit: 500,
    });
    for (const entry of page.entries) {
      if (entry.item.type !== "tool_call") continue;
      await store.upsert(toRow(entry.item, classify(entry.item, provider), {
        turnId: entry.turnId, ts: entry.timestamp, seq: entry.seqStart,
      }));
    }
    await store.setSyncState(agentId, page.endCursor?.epoch ?? page.epoch, page.endCursor?.seq ?? 0);
    if (!page.hasNewer) break;
    cursor = page.endCursor ?? undefined;
  }
}
```

## 6. UI

双入口：

1. **本 agent**：composer pill → agent workspace panel（对齐 skills）
2. **全部 + 按 provider**：侧边栏 **Tool Usage** surface（M4）

删除脚手架 greeting；**允许**正式的 Tool Usage sidebar（非 greeting）。

### Composer pill（本 agent 会话，单个）

- API：`client.addComposerPill({ id, workspaceId, agentId, button })`
- 注册方式参照 skills：`agents.subscribe` + `agents.list()` seed
- **合并为一个框**：不拆成 shell/skill/mcp 多个 pill
- `behavior` → `{ kind: "popover", Content: UsagePopover }`（composer 上方浮层；Command Center 仍 `openPanel("usage")`）
- **数据范围**：仅当前 `agentId`（`usage.skills-by-name` + `usage.mcp-by-tool` 决定 label；`usage.summary` 一并预取）
- label / visible：注册时 label `Usage`（loading 占位，保证 icon 查询挂载）；查询完成后：无 skill（total>0）且无 MCP → 短暂 grace 轮询后再 `visible:false`（不清空 title）；有 → **最近调用**的一个 skill/MCP 美化名（**不带 ×n**）；实体数 > 1 时为 `Name + N`（N = 实体总数 − 1；**不含 shell**）；query 失败时保持 `Usage` 可见以便打开 popover
- agent 更新事件**不** `remove`+重注册 pill（避免无故清空已显示 label）；但 `status === "idle"` 且 pill 已隐藏时，将 `visible:true` 以 remount icon，让 post-`turn_ended` 入库后的数据能再次查询（host 在 `visible:false` 时会卸掉 trigger / icon）
- `useUsagePillData`：`retry: false`；`refetchOnMount: "always"`；空结果时 `refetchInterval` 直到有 badge 或 grace 结束隐藏
- `title`（无障碍）：`Tool usage`

### Composer pill popover（本 agent 速览）

- `behavior.kind = "popover"`，Content = `UsagePopover`；宿主负责锚定 / 滚动 / padding
- 行：类型图标（skill `Sparkles` / MCP `Plug`）；**不展示调用次数 / failures**；列表按 **最近使用降序**（最新在上，最早在下）
  - skill 行：名称（14px）在左，最近使用同一行靠右对齐；时间用 `FormattedTime`（app lang + locale；见 039）；名称可点进 SKILL.md
  - SKILL.md 详情顶栏：左 `← Skills`，右 `PanelRight` 按钮 → `client.openPanel("usage")` 在 agent workspace panel 打开同一文件（对齐 Skills 扩展的 panel 入口）
  - MCP 行：仅 `server.tool` 美化名（按 `lastUsedAt` 降序）
- 展示名统一 `formatDisplayName` 美化（`-` / `_` → 空格，每个单词首字母大写）；skill / MCP / pill 一致，库内原始名与排序不变
- 无分区标题行、无 resync / export 按钮；resync / export 仅在 agent panel 与 Command Center
- 两类都有数据时顶部保留 Skills / MCP 分段芯片

### Agent workspace panel（本 agent 详情）

`client.addWorkspacePanel({ id: "usage", context: "agent", ... })`：

1. **Skills**（按 skill 名）/ **MCP**（按 server.tool）；仅有调用数据时才展示对应 tab；无 Overview；本会话全量、无日期筛选
2. **SKILL.md 阅读器**：带 `skillPath` 的 skill 名为链接 → `usage.read-skill` 在同一 panel 展示正文（等宽、可选中；← Skills 返回）；无 path 时纯文本；全局 surface 不提供链接
3. resync、export
4. 布局：React Native 原语 + `theme.colors` / `layout.compact`；列表无「By skill」「By server」小标题

### 侧边栏全局 surface（全部 usage · 按 provider）— M4

- `client.addSurface("tool-usage", GlobalUsageSurface)`
- `client.addSidebarItem({ id: "tool-usage", title: "Tool Usage", icon: "Activity", surface: "tool-usage" })`（图标后统一为 `Activity`，见 003）
- **范围**：全部 `tool_calls`（不传 `agentId`），非当前 agent 限定
- **分组**：`normalizeProvider(row.provider)`；每个 provider 一块卡片/章节
- **每块最少**：provider 显示名、agent 数、**skills 按名**、**MCP 按 server.tool**（failures 内联）；**不展示 shell**
- **交互**：时间范围芯片 + **provider 分段筛选**（样式同时间条；今天 / 7d / 30d / 全部；默认 All）；**筛选项**来自全库 `usage.by-provider`（无 from/to）：凡 agents / tool_calls / user_messages 出现过的 provider 均列出；内容查询仍带时间窗；切换时间不重置已选 provider；顶部 **Top 5 Skills**（随筛选）；下方按 provider 分块（选中某一 provider 时只显示该块）；无页标题 / 说明文案；UI 只展示 MCP / Skills（采集与库内数据仍保留）
- **与 agent panel**：侧边栏看全局对比；pill/panel 看单会话；**skill / MCP 均按实体聚合，不只展示类别总数**

### Command Center

- `Tool usage` → 打开 **当前 agent** panel
- `Open Tool Usage (all providers)` → `openSurface("tool-usage")`（M4）
- `重扫全部 agent 历史` / `导出使用报告`

### 删除的脚手架

- greeting surface / sidebar / RPC（已完成）

### v2 预留

- 周报写入 vault（`work/System/Memory/`）
- 30 天未使用 skill 提醒
- MCP 失败率告警
- pill popover 内联迷你总览
- 全局 surface 内按 provider 下钻到 agent 列表

## 7. 风险与限制

| 风险 | 应对 |
|---|---|
| hook 事件丢失（无重放） | 懒回填 + 主动 resync |
| turn_ended 无精确时间 | 回填补 `ts`；live 用 `ingested_at` |
| ACP skill 归类不可靠 | 标 inferred，面板分档，不混入 exact |
| 误报（读 SKILL.md ≠ 调用） | 根目录白名单 + 分档 + 可选排除路径 |
| hook 30s 超时 | handler 只做线性扫描 + 增量写，重活放 RPC |
| 数据增长 | 默认全量保留；提供按天清理设置（v1.1） |
| `usage.read-skill` 读取任意本地路径 | 仅接受非空、无 NUL 的路径；UI 只从库内 `skillPath` 触发；插件为本机可信上下文 |
| `node:sqlite` 不可用 | JSONL fallback |
