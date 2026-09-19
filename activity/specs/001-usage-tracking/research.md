# 001 — 调研与源码依据（research）

> 基于本机 Paseo 0.8.0（daemon / CLI / desktop 均 0.8.0）源码核实。行号为当时版本，升级后需复核。

## 1. 结论摘要

| 维度 | 结论 |
|---|---|
| 采集入口 | `agent.turn_ended` hook 提供全量 timeline 快照，足够做统计 |
| 精确时间 | 快照无时间戳；回填 `timeline.refetch` 的 `entries[]` 有 `timestamp / turnId / seqStart` |
| Skill exact | 只有 Claude（`Skill`）与 OpenCode（`skill`）可稳定识别 |
| Skill inferred | Pi 模型加载 skill 会 read SKILL.md；Codex 自主加载走 shell/read；可推断 |
| Skill 漏报 | 用户 composer 触发（Codex 注入、Pi 展开）无 tool_call |
| MCP 命名 | Claude `mcp__s__t`；Codex / Pi `s.t`（自描述）；OpenCode `<s>_<t>`（需名单）；ACP 仅 title（常空） |
| ACP | tool_call `name = kind ?? title`，无 skill 语义；commands 一律 kind:"command" |

## 2. Provider 能力矩阵

### 2.1 Skill 调用可见性

| Provider | 模型自主调用 | 用户 composer 触发 |
|---|---|---|
| Claude Code | exact：`Skill` 工具，`detail.label` = skill 名 | 命令展开，通常无 tool_call |
| OpenCode | exact：`skill` 工具，`detail.label` = skill 名 | 命令展开，通常无 tool_call |
| Codex | inferred：shell/read 打开 SKILL.md | 无 tool_call（app-server 注入 `{type:"skill"}` input block） |
| Pi | inferred：按 system prompt 指示 read skill 文件 | 无 tool_call（`skill_expansion` 注入文本） |
| Cursor (ACP) | inferred：read `~/.cursor/skills/<name>/SKILL.md`（及项目 `.cursor/skills`） | 无 |
| CodeBuddy (ACP) | 同 Cursor；是否走 SKILL.md 机制未知 | 无 |

### 2.2 commands() 的 skill 标记

| Provider | 是否标 kind:"skill" |
|---|---|
| Claude | 是（排除 root-only commands 外按 skill 处理，启发式） |
| OpenCode | 是（`source === "skill"`） |
| Codex | 是（`skills/list`） |
| Pi | 是（`source === "skill"`） |
| Cursor / CodeBuddy (ACP) | 否，一律 kind:"command" |

## 3. 源码依据

- `@getpaseo/plugin/dist/server/lifecycle.d.ts:49-54` — `agent.turn_ended` 携带 `timeline: readonly AgentTimelineItem[]`
- `@getpaseo/plugin/dist/server/lifecycle.d.ts:86-91` — `server.on` / `server.before` 签名与清理
- `@getpaseo/client/dist/index.d.ts:217-235` — `PaseoAgentTimelineHandle.append / refetch / subscribe`
- `@getpaseo/client/dist/index.d.ts:266-273` — `agent.commands()`：会话实际加载的 commands/skills
- `@getpaseo/protocol/dist/messages.d.ts:10826-10865` — refetch payload：`direction / projection / epoch / startCursor / endCursor / hasOlder / hasNewer / entries[]`
- `@getpaseo/protocol/dist/agent-types.d.ts:256-280` — `ToolCallTimelineItem`（`callId / name / detail / metadata / status`）
- `@getpaseo/protocol/dist/agent-types.d.ts:303-325` — `AgentTimelineItem` 联合（无 skill/command 类型）
- `@getpaseo/server/.../providers/claude/tool-call-detail-parser.js:85` — Claude `Skill` → `plain_text` + `icon: "sparkles"`，label = skill 名
- `@getpaseo/server/.../providers/opencode/tool-call-detail-parser.js:214` — OpenCode `skill` 同上
- `@getpaseo/server/.../providers/codex-app-server-agent.js:2971-2980` — Codex skill 以 `{type:"skill"}` input block 注入
- `@getpaseo/server/.../providers/codex-app-server-agent.js:462-472` — Codex skills 目录候选
- `@getpaseo/server/.../providers/codex/tool-call-mapper.js:461-468` — Codex MCP 命名 `<server>.<tool>`
- `@getpaseo/server/.../providers/pi/tool-call-mapper.js:135-166` — Pi MCP 命名 `<server>.<tool>`；未知工具透传
- `@getpaseo/server/.../providers/pi/agent.js:57` — Pi `source === "skill"` → `kind: "skill"`
- `@getpaseo/server/.../providers/acp-agent.js:2001-2006` — ACP `available_commands_update` 一律 `kind:"command"`
- `@getpaseo/server/.../providers/acp-agent.js:2465-2477` — ACP tool_call `name = kind ?? title`，`metadata = { kind, title }`
- `@getpaseo/server/.../providers/acp-agent.js:2520-2548` — ACP kind → detail 映射
- 插件参考文档 — 事件 best-effort 无重放；hook 超时 30s；事件并发顺序不保证

## 4. 开放问题（实现时验证）

- [ ] user_message 在 timeline 中是否保留 `/name` / `$name` 原文（决定 user-triggered 档是否可行；可选，v1 未实现）
- [ ] **用户发送次数统计** → 已拆至 [006-user-messages](../006-user-messages/)（SQLite 事件表；非查询时现算 timeline）
- [ ] Pi 的 skills 根目录实际路径
- [x] OpenCode MCP tool 的实际命名格式
  - 结论（2026-09-18）：真实调用名为 `<server>_<tool>`（例 `mobile-mcp_mobile_list_available_devices`、`paseo_list_agents`）。`resolveMcpServers` 从 OpenCode 配置 + Paseo `paseo` 注入 + agent 持久化名单传入 `classifyMcp`；`usage.resync` 全量回扫纠偏。
- [x] 插件子进程运行时 `node:sqlite` 是否可用
  - 结论（2026-09-18）：本机 Node v24.14.0 / Paseo 0.8.0 子进程可用。`process.getBuiltinModule("node:sqlite")` 返回 `DatabaseSync`；单测与 `createUsageStore()` 默认走 sqlite，路径 `~/.paseo/plugin-data/tool-usage/usage.db`。不可用时自动退化为 JSONL。
- [ ] `timeline.refetch` 的 `limit` 上限与分页稳定性（长会话）
- [x] ACP `metadata.title` 是否包含可用的 skill / MCP 标识
  - Skill：已观察到 Cursor 主动上报 read → inferred skill 生效
  - MCP：部分调用 `kind=other` 且 title 为空/「Other」，无法识别（日志仅 `[Other]`）；若 title 为 `s.t` / `mcp__s__t` / `<server>_<tool>`（需名单）则可 inferred

## 5. UI 参考（skills composer pill）

本机 skills 插件（`~/.paseo/plugins/skills/.../checkout/skills`）已验证的入口模式：

- `client.addComposerPill({ id, workspaceId, agentId, button })` — 输入框上方轨道
- `button.icon` 为组件：内部 `useQuery` / RPC，再 `pill.update({ label })` 刷新计数
- 查询完成前 label 保持标题（避免闪 `0`）
- `behavior.onPress` → `client.openPanel(...)`；Command Center 同 panel
- `agents.subscribe` + `agents.list()` seed；每 agent 一个 registration

tool-usage：本 agent 用同一 pill→panel 模式（一个 pill 展示 skill / MCP，空则隐藏）；**全部 usage** 另加侧边栏 surface（M4）：

- `client.addSurface("tool-usage", …)` + `client.addSidebarItem({ title: "Tool Usage", surface: "tool-usage" })`
- 数据：`usage.by-provider`，分组键 `normalizeProvider`；UI 不展示 shell（库内保留）
- 与 pill 并存：pill = 当前 agent；sidebar = 全库按 provider

### SKILL.md 阅读器（M5）

- server：`usage.read-skill` 用 `expandHomePath` + `readFile`；响应 path 折叠为 `~`；`skillName` 取 `SKILL.md` 父目录名；仅校验非空 / 无 NUL
- client：panel 内用本地 `skillDetail` 状态切换列表 / 正文视图（不新增 surface）；列表项仅在有 `skillPath` 时为链接
- 本 agent 路径补全含项目 skill 根；全局 surface 仍 home-only（防跨 workspace）
- 路径补全：`server/skill-path.ts` 扫描 home 技能根（直接 `<root>/<name>/SKILL.md` 与一层分类 `<root>/<category>/<name>/SKILL.md`）；项目相对根不参与
