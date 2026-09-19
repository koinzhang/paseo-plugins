# 001 — 任务拆解（tasks）

> 规则：完成任务后勾选并更新状态；每项必须按「验收」验证后才算完成。

## M1 — 采集链路（hook + 落库）

- [x] **T1.1 shared 分类契约**
  - 定义 `Category`（skill / mcp / regular）、`Confidence`（exact / inferred / low）、`ClassifyResult`、技能根目录默认配置
  - 验收：`shared/classify.ts` 纯函数，无 Node/React 依赖；typecheck 通过
  - 验证：`npm run typecheck` 通过；`shared/classify.ts` 仅依赖 `zod`，导出 zod schema + `classifyToolCall` / `matchSkillFile` / `DEFAULT_SKILL_ROOTS`
- [x] **T1.2 store（SQLite）**
  - `node:sqlite` 建库（路径 `~/.paseo/plugin-data/tool-usage/usage.db`），执行 `contracts/schema.sql`
  - `upsertMany` 幂等（`ON CONFLICT(agent_id, call_id)` 更新 status/error）
  - 验收：单测覆盖重复 upsert 不产生重复行；不可用时能退化 JSONL
  - 验证：`npm test` 中 store 用例全绿（sqlite 幂等 / running→completed / 不降级终态 / reopen 持久化；jsonl fallback 同等行为）；本机 Node 24 `process.getBuiltinModule("node:sqlite")` 可用
- [x] **T1.3 classify 实现**
  - skill exact / inferred / low；MCP（Claude / Codex / Pi 规则 + OpenCode 配置名单）；shell；其他 kind
  - 验收：单测覆盖各 provider 样例（见 research.md 的样例表）
  - 验证：`npm test` classify 用例覆盖 Claude/OpenCode exact、Codex inferred/low、Claude/Codex/Pi/OpenCode/ACP MCP、普通 shell
- [x] **T1.4 turn_ended hook 接线**
  - `server.on("agent.turn_ended")` → 扫描 tool_call → classify → upsert
  - 异常只 `console.error`，不抛出
  - 验收：跑一个真实 turn，库中出现记录且不重复；`paseo plugin logs tool-usage` 无异常
  - 验证：`paseo plugin reload tool-usage` 后 `store ready (driver=sqlite)`；真实 turn 日志出现 `turn_ended ... rows=N total=N`；无 stderr 异常；同 callId 重复 upsert 不增行
- [x] **T1.5 M1 联调验收**
  - Claude / OpenCode 各跑一个含 skill 或 shell 的 turn
  - 验收：`sqlite3` 查询能看到对应 category 记录
  - 验证：OpenCode agent `f0d4abca…` → `category=regular detail_type=shell command=echo tool-usage-m1-opencode`；Claude agent `582786b7…`（模型 `DeepSeek-V4.1-Flash-astra`）→ 同结构 `tool-usage-m1-claude`；`paseo plugin ls` 为 running
  - 复验（opencode agent，20:54）：`npm run typecheck` 通过、`npm test` 28/28；OpenCode `7843b071…` 与 Claude `2f16b27a…`（`DeepSeek-V4.1-Flash-astra`）各跑 `echo tool-usage-m1-claude/opencode` 入库为 `category=regular detail_type=shell status=completed`；`dup_pk=0`（`agent_id+call_id` 无重复）；日志 `turn_ended … rows=4 total=120` 无 stderr 异常

## M2 — 回填 + Composer UI

- [x] **T2.0 拆除 greeting 脚手架**
  - 删除 `client/greeting.tsx`、`server/greeting.ts`、`shared/greeting.ts` 及入口注册
  - 验收：`index.client.tsx` / `index.server.ts` 无 greeting；typecheck 通过；reload 后无 Greeting sidebar
  - 验证：greeting / web.ts 已删；`npm run typecheck` 通过；`paseo plugin reload tool-usage` → running，无 Greeting 注册
- [x] **T2.1 resync RPC**
  - `usage.resync`：遍历 `agents.list()`，按 `sync_state` 增量拉取 `timeline.refetch`（canonical）
  - 验收：重复执行 resync 数据量不翻倍；`sync_state.last_seq` 正确推进
  - 验证：`server/handlers.ts` `resyncAgents` 实现全量（tail→before）与增量（after）；store 暴露 `getSyncState`/`setSyncState`；typecheck 通过
- [x] **T2.2 查询 RPC**
  - `usage.summary` / `usage.list`（summary 支持按 `agentId` 过滤，供 pill 使用）
  - 验收：契约 zod 在 shared/，输入输出双向校验；与直接 SQL 结果一致
  - 验证：`shared/usage.ts` zod 契约；RPC 名仅小写；`summarizeRows` 单测通过
- [x] **T2.3 composer pill（合并单框，对齐 skills）**
  - `addComposerPill`：每 agent 一个 pill；label 合并 skill / mcp 计数（shell 自 M5 起不进入 label）；icon 内查询并 `update({ label })`
  - 点击 `openPanel("usage")`
  - 验证：`client/pill.tsx`；label `{server}.{tool}×{n} · {skill}×{n}…`（仅当前 agentId；按 skill 名）；查询前显示 `Usage` 占位（M5 修订）
- [x] **T2.4 workspace panel 详情**
  - agent panel：仅有数据时展示 Skills / MCP（无 Overview）；数字与 pill 同源
  - 验证：`client/panel.tsx` 动态 tab + 本 agent resync；`theme.colors` / `layout.compact`
- [x] **T2.5 Command Center**
  - `Tool usage` 打开 panel；`Rescan tool usage history`（当前 agent resync）
  - 验证：`index.client.tsx` 注册两项；reload 后 plugin running

## M3 — 报告与收尾

- [x] **T3.1 导出 markdown 报告**
  - `usage.export` → markdown（总览、Skills 分档、MCP、Shell top）
  - 验收：导出内容与 panel / pill 数字一致
  - 验证：panel「Export markdown」复制报告；含 Skills by name（exact/inferred/low 分列）；`npm test` 含聚合单测
- [x] **T3.1b Skills 按名称统计**
  - `usage.skills-by-name`：按 skillName 聚合 exact / inferred / low / total / lastUsedAt
  - Skills tab 展示分 skill 卡片，不再只列 recent call 流水
  - 验证：`aggregateSkillsByName` 单测；panel Skills tab 按名展示
- [x] **T3.2 未使用 skill 清单** — **已撤销**（ACP/`commands()` 不可靠；RPC `usage.unused-skills` 与 UI 已删除）
- [x] **T3.3 文档与验收**
  - 更新 contracts/rpc.md、tasks；确认 greeting 已移除
  - 验证：`npm run typecheck` / `npm test` 通过；plugin reload running

## M4 — 侧边栏全局 Tool Usage（按 provider）

- [x] **T4.1 RPC `usage.by-provider`**
  - 全库（可选时间 / workspace）按 `normalizeProvider(provider)` 聚合
  - 输出每组 shell / skill 分档 / mcp / failures / agentCount
  - 验收：zod 契约在 shared/；单测覆盖 `claude/opus`→`claude` 归组；与直接 select+聚合一致
  - 验证：`aggregateByProvider` 单测；`usageByProviderRpc` + `createByProviderHandler` 已注册
- [x] **T4.2 侧边栏 surface**
  - `addSurface("tool-usage")` + `addSidebarItem({ title: "Tool Usage", … })`
  - 展示全部 usage，按 provider 分块；时间范围过滤
  - 验收：侧边栏可见 Tool Usage；打开后不依赖当前 agent；切换主题文字颜色正常；compact 布局可用
  - 验证：`client/global-surface.tsx`；`npm run typecheck`
- [x] **T4.3 Command Center（可选）**
  - 「Open Tool Usage (all providers)」→ `openSurface("tool-usage")`
  - 验收：⌘K 可打开与侧边栏同一 surface
  - 验证：`index.client.tsx` `context: "global"` 项
- [x] **T4.4 文档**
  - 勾选 tasks；确认 spec US-9 / G8 与实现一致
  - 验收：`paseo plugin reload` 后 running；侧边栏与 pill 共存无冲突
  - 验证：`npm run typecheck` / `npm test`；reload tool-usage

## M5 — 收尾修订（pill 可见性 / SKILL.md 阅读器）

- [x] **T5.1 pill 可见性与加载健壮性**
  - 加载 / 查询失败时保持 `Usage` 标题可见（保证 icon 挂载、可打开 panel）；仅成功且无 skill / MCP 时隐藏（不清空 title）；`retry: false`；agent 更新不重建 pill
  - 验收：无调用 agent 查询成功后不出现占位；有调用 agent 显示 `server.tool×n · skill×total`（不含 shell）；RPC 失败时不出现宿主错误态
  - 验证：`client/pill.tsx` / `client/usage-query.tsx`；`npm run typecheck` 通过
- [x] **T5.2 面板 / 全局 UI 精简**
  - 隐藏空分区、移除 unused-skills、全局 provider 分段筛选 + Top 5 Skills、去页标题
  - 验收：无数据类别不出现；全局筛选与时间范围联动；数字与 RPC 一致
  - 验证：`client/panel.tsx` / `client/global-surface.tsx`；`npm test` 36/36 通过
- [x] **T5.3 skillPath 解析**
  - `usage.skills-by-name` / `usage.by-provider` 返回 `skillPath`：采集 `file_path` 优先，缺失时按 home 技能根解析（含一层分类）
  - 验收：无 `file_path` 的 skill 也能解析到本地 SKILL.md；项目相对根不参与
  - 验证：`server/skill-path.ts` / `preferSkillPath`；`npm test` 聚合用例通过
- [x] **T5.4 面板内 SKILL.md 阅读器**
  - `usage.read-skill`；Skills 链接 → 正文视图（← Skills 返回）；全局不展示链接
  - 验收：点击 skill 名展示 SKILL.md 正文；无 path 时纯文本；读取失败显示错误
  - 验证：`client/panel.tsx` / `server/handlers.ts`；`npm run typecheck` / `npm test` 通过
- [x] **T5.5 文档同步**
  - spec / plan / research / contracts 与实现对齐（shell UI 口径、pill label、阅读器、skillPath）
  - 验收：文档不再出现「详情 Shell 区」「pill 含 shell」「provider 块含 shell」等旧描述
  - 验证：本次提交；`npm run typecheck` 通过、`npm test` 36/36

## M6 — pill 空结果藏死后无法复活

- [x] **T6.1 idle remount + empty grace 轮询**
  - 根因：`visible:false` 卸掉 icon；turn 中空查询藏死后，`turn_ended` 入库也无法再查
  - 修复：`idle` 且已隐藏 → `visible:true` remount；空结果 grace 内保持可见并 `refetchInterval`；`refetchOnMount: "always"` / `staleTime: 0`
  - 验收：turn 中打开的 agent，turn 结束后出现 top-skill label；无 skill 的 agent 仍会隐藏（grace 后）
  - 验证：`client/pill.tsx` / `client/usage-query.tsx`；`npm run typecheck` 通过、`npm test` 43/43

## M7 — 项目 skill 超链接 + skillPath 用 `~`

- [x] **T7.1 skills-by-name 用 agent cwd 根解析；路径折叠 `~`**
  - 本 agent：`buildSkillRoots` 补全 exact 无 `file_path` 的项目 skill；全局仍 home-only
  - `collapseHomePath` / `expandHomePath`；`usage.read-skill` 支持 `~/…`
  - 验收：tapd/zhihu 等项目 exact skill 可点开；UI/RPC 不出现 `/Users/…`
  - 验证：`server/skill-path.ts` / `handlers.ts`；`npm run typecheck` 通过、`npm test` 47/47

## M8 — pill / popover 去次数，pill 用 Name + N

- [x] **T8.1 formatUsagePillLabel + popover UI**
  - pill：最近调用的 skill/MCP 美化名；实体 > 1 → `Name + N`；不带 ×count
  - popover：去掉 · count / failures
  - 验收：单实体仅名；多实体 `Daily Summary + 6`；popover 无次数
  - 验证：`shared/usage.ts` / `client/usage-popover.tsx`；`npm test` 58/58、`npm run typecheck` 通过

## M9 — popover 按最近使用降序

- [x] **T9.1 popover newest-first；MCP 补 lastUsedAt**
  - popover skill/MCP 按 `lastUsedAt` 降序；`aggregateMcpByTool` 记录 `lastUsedAt`
  - 验收：最新调用在上，最早在下
  - 验证：`client/usage-popover.tsx` / `shared/usage.ts`；`npm test` / `npm run typecheck` 通过

## M10 — pill 显示最近调用

- [x] **T10.1 formatUsagePillLabel 按 lastUsedAt**
  - 从「调用最多」改为「最近调用」的 skill/MCP
  - 验收：最新实体名出现在 pill；仍支持 `Name + N`
  - 验证：`shared/usage.ts`；`npm test` 60/60、`npm run typecheck` 通过

## M11 — popover 打开 SKILL.md 到 Usage panel

- [x] **T11.1 PanelRight → openPanel("usage")**
  - 详情顶栏右侧按钮；`requestOpenSkillInPanel` + panel 消费；对齐 Skills 的 `client.openPanel`
  - 验收：点击后关闭 popover，Usage 侧栏打开并显示该 SKILL.md
  - 验证：`client/usage-popover.tsx` / `client/panel.tsx` / `client/pill.tsx`；`npm run typecheck` 通过

## M8 — OpenCode MCP 名单接线

- [x] **T8.1 resolveMcpServers + ingest/resync**
  - OpenCode `<server>_<tool>` 依赖名单；从 OpenCode 配置 / Paseo `paseo` 注入 / agent 持久化解析并传入 classify
  - ACP：title 支持名单前缀；Codex `s.t` 无需名单（源码 `buildMcpToolName`）
  - `usage.resync` 改为始终全量回扫以纠偏历史 mis-classify
  - 验收：`mobile-mcp_…` / `paseo_…` 入库 `category=mcp`；Cursor 无 title 的 `other` 仍可能漏报（已文档化）
  - 验证：`npm test` 58/58、`npm run typecheck`；`resolveMcpServers` → `paseo`+`mobile-mcp`+`xapi`；agent `85a71110…` 行纠偏为 `mcp|mobile-mcp|mobile_list_available_devices`；另纠偏 26 条 `paseo_*`；`paseo plugin reload` → running
