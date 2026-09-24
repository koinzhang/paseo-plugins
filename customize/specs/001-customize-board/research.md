# 001 — Research：各 provider 配置机制

版本锚点（2026-09-25 核实）：

- Paseo 源码 `../paseo` @ `49f9cec6b`，`paseo --version` 0.9.1，`@getpaseo/plugin` 0.9.1
- Claude Code 官方文档 `code.claude.com/docs/en/{memory,skills,mcp}.md`
- Codex CLI 0.156.1；文档 `developers.openai.com/codex/{skills,rules,guides/agents-md}.md`；源码 `openai/codex` main `codex-rs/ext/skills/src/{host_roots.rs,loader/mod.rs,loader/discovery.rs}`
- Cursor 文档 `cursor.com/docs/context/{rules,skills}.md`、`cursor.com/docs/cli/mcp.md`；cursor-agent `2026.09.23-86fc751` bundle
- OpenCode 文档 `opencode.ai/docs/{rules,skills}`
- GitHub Copilot CLI 文档 `docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference`
- Pi `@earendil-works/pi-coding-agent` 0.87.1 自带 `docs/{configuration,skills,settings}.md`
- Oh My Pi `@oh-my-pi/pi-coding-agent` 18.2.8 源码 `src/discovery/*`、`src/extensibility/skills.ts`、`src/config/settings-schema.ts`

## Paseo 插件 API

- 入口：`addSidebarItem({ id, title, icon, surface })` + `addSurface(id, Component)`，渲染在侧栏顶部导航（与 New workspace / History / Search / Schedules 同组，同 Activity）。
- `PluginSurfaceProps` 不含 workspace；SDK 也不暴露当前 workspace。Web / Electron 路由为 `/h/<server>/workspace/<id>`（`packages/app/src/utils/host-routes.ts`，非 URL-safe id 编码为 `b64_` + base64url），surface 为 `/h/<server>/plugin/<pluginId>/<surfaceId>`；客户端轮询 `location.pathname` 记录最后一个 workspace id，再用 `paseo.workspaces.list` 分页查到该 workspace 的 `projectRootPath` 作为默认 project（`useWorkspace` / `useAgent` 只能在 workspace / agent panel 内调用，surface 里会抛 `Plugin state hooks must run inside a workspace panel`）。原生端无此信号，回退到 project 列表第一项。
- Project 列表：`paseo.projects.list()` → `{ projects: [{ projectId, projectDisplayName, projectRootPath, projectKind }] }`。
- 打开文件：插件导航只有 `openBrowser / openAgent / openWorkspace`，没有「在 Paseo 中打开文件」→ 走 server RPC，用系统打开器（macOS `open`，Linux `xdg-open`，Windows `start`）。

## 内置 provider

`packages/protocol/src/provider-manifest.ts` `BUILTIN_PROVIDER_IDS` = claude、codex、copilot、opencode、pi、omp；cursor 为 ACP provider（`cursor-acp-agent.ts`）。

## Claude Code

| 类别 | 位置 | 说明 |
|---|---|---|
| Instructions | managed `/Library/Application Support/ClaudeCode/CLAUDE.md`（Linux `/etc/claude-code/CLAUDE.md`）；user `~/.claude/CLAUDE.md`；project `CLAUDE.md`、`.claude/CLAUDE.md`、`CLAUDE.local.md`（cwd 及所有上级目录，启动加载）；子目录内的 CLAUDE.md 在读取该目录文件时按需加载 | `AGENTS.md` 仅在 cwd 及以上**没有** CLAUDE.md / CLAUDE.local.md 时读取（v2.1.277+）；`claudeMdExcludes`（settings，glob）排除 |
| Rules | `~/.claude/rules/**/*.md`、`.claude/rules/**/*.md`（**递归**）；嵌套 `.claude/rules` 按需 | frontmatter `paths:` → 仅匹配文件时加载，否则每次加载 |
| Skills | `~/.claude/skills/<name>/SKILL.md`、`.claude/skills/<name>/SKILL.md`（cwd 到 repo 根）、嵌套 `<dir>/.claude/skills`（在该目录工作时加载）；`.claude/commands/*.md` 已并入 skills | 每个 skills 根**只扫一层**；`disable-model-invocation: true` → 仅手动；`user-invocable: false` → 不在 `/` 菜单；settings `skillOverrides`：`off` / `user-invocable-only` / `name-only` / `on` |
| MCP | user：`~/.claude.json` `mcpServers`；local：`~/.claude.json` `projects[<path>].mcpServers`；project：`.mcp.json`；managed `managed-mcp.json` | `.mcp.json` 需批准：`enableAllProjectMcpServers` / `enabledMcpjsonServers` 批准，`disabledMcpjsonServers` 拒绝；`projects[<path>].disabledMcpServers` 按项目关闭 |

## Codex

| 类别 | 位置 | 说明 |
|---|---|---|
| Instructions | `$CODEX_HOME/AGENTS.override.md` 否则 `AGENTS.md`（首个非空）；project 从 git 根走到 cwd，每级 `AGENTS.override.md` > `AGENTS.md` > `project_doc_fallback_filenames`，每级至多一个 | 合并上限 `project_doc_max_bytes`（默认 32 KiB） |
| Rules | `$CODEX_HOME/rules/*.rules`、`<project>/.codex/rules/*.rules`（仅 trusted project） | **命令审批策略**（Starlark `prefix_rule`），不是提示词规则 |
| Skills | repo：cwd→repo 根每级 `.agents/skills`、`<project>/.codex/skills`（project config layer）；user：`~/.agents/skills`、`$CODEX_HOME/skills`（deprecated，仍加载）、system `$CODEX_HOME/skills/.system`；admin `/etc/codex/skills` | **递归**，`MAX_SCAN_DEPTH = 6`，跳过隐藏目录，跟随符号链接；`agents/openai.yaml` `policy.allow_implicit_invocation: false` → 仅显式 `$skill`；`[[skills.config]] path = … enabled = false` 禁用 |
| MCP | `$CODEX_HOME/config.toml` `[mcp_servers.<name>]`；`<project>/.codex/config.toml`（trusted） | `enabled = false` 禁用 |

Trust：`config.toml` `[projects."<abs path>"] trust_level = "trusted"`。

## Cursor

| 类别 | 位置 | 说明 |
|---|---|---|
| Instructions | `AGENTS.md`（根目录 + 任意子目录，嵌套的作用于该目录）；cursor-agent 还监听根目录 `CLAUDE.md`、`CLAUDE.local.md`、`.cursorrules`（legacy） | User Rules 存在 Cursor 设置（非文件），Team Rules 在 dashboard |
| Rules | `.cursor/rules/**/*.mdc`（**递归**，子目录嵌套 `.cursor/rules` 亦可） | `.md` 在 rules 目录中被忽略；`alwaysApply: true` → Always；`globs` → 匹配文件时附加；仅 `description` → Agent 决定；都没有 → 仅 @ 手动 |
| Skills | project `.agents/skills`、`.cursor/skills`，兼容 `.claude/skills`、`.codex/skills`；user `~/.agents/skills`、`~/.cursor/skills`、`~/.claude/skills`、`~/.codex/skills`；内置 `~/.cursor/skills-cursor` | **递归**找 SKILL.md；仓库内任意子目录的 `.cursor/skills` / `.agents/skills` 自动限定到该目录；`disable-model-invocation: true` → 仅 `/skill`；`paths`（旧 `globs`）→ 匹配文件时 |
| MCP | `~/.cursor/mcp.json`、`<project>/.cursor/mcp.json` | CLI `agent mcp disable` 写 `~/.cursor/projects/<slug>/mcp-disabled.json`（字符串数组），slug = 项目根路径非字母数字替换为 `-` 并去首尾 `-` |

## OpenCode

| 类别 | 位置 | 说明 |
|---|---|---|
| Instructions | project：从 cwd 向上到 git worktree，`AGENTS.md` 优先，否则 `CLAUDE.md`；global `~/.config/opencode/AGENTS.md`，否则 `~/.claude/CLAUDE.md` | `OPENCODE_DISABLE_CLAUDE_CODE` / `_PROMPT` 关闭 Claude 兼容 |
| Rules | `opencode.json(c)` 的 `instructions`（路径 / glob / URL，project 与 global 合并） | OpenCode 把 AGENTS.md 称为 rules；这里 Rules 类展示 `instructions` |
| Skills | `.opencode/skills/*/SKILL.md`、`.claude/skills/*/SKILL.md`、`.agents/skills/*/SKILL.md`（cwd→worktree 根）；`~/.config/opencode/skills`、`~/.claude/skills`、`~/.agents/skills` | **只扫一层**；无手动-only 标记；`permission.skill` 通配：`deny` 隐藏、`ask` 需确认；`OPENCODE_DISABLE_CLAUDE_CODE_SKILLS` |
| MCP | `opencode.json(c)` `mcp`（global `~/.config/opencode/`，project 根目录 / `.opencode/`） | `enabled: false` 禁用 |

## GitHub Copilot CLI

| 类别 | 位置 | 说明 |
|---|---|---|
| Instructions | git 根与 cwd：`AGENTS.md`、`CLAUDE.md`、`GEMINI.md`、`.github/copilot-instructions.md`；`~/.copilot/copilot-instructions.md` | `--no-custom-instructions` 关闭 |
| Rules | `.github/instructions/**/*.instructions.md`、`~/.copilot/instructions/**/*.instructions.md` | frontmatter `applyTo` glob |
| Skills | `.github/skills`、`.agents/skills`、`.claude/skills`、上级 `.github/skills`；`~/.copilot/skills`、`~/.agents/skills`；`.claude/commands/*.md` | `disable-model-invocation`、`user-invocable` |
| MCP | `~/.copilot/mcp-config.json`；workspace `.mcp.json`、`.github/mcp.json`（cwd→git 根，需 trusted folder） | `/mcp disable` 写入用户配置，文件字段未在文档中说明 → 一期不判定禁用 |

## Pi

| 类别 | 位置 | 说明 |
|---|---|---|
| Instructions | `<agent-dir>`（`~/.pi/agent`，`PI_CODING_AGENT_DIR`）与 cwd 及所有上级目录：每级 `AGENTS.override.md` 替代同级 `AGENTS.md` / `AGENTS.MD` / `CLAUDE.md` / `CLAUDE.MD`；`SYSTEM.md`（替换系统提示）、`APPEND_SYSTEM.md`（追加），project 版在 `.pi/` | 上下文文件不需要 project trust |
| Rules | 不支持 | — |
| Skills | `<agent-dir>/skills`、`.pi/skills`（递归 SKILL.md 目录 + 根目录独立 `.md`）；`~/.agents/skills`、`.agents/skills`（cwd→repo 根）；settings `skills` 额外路径 | **递归**；`disable-model-invocation: true` → 仅 `/skill:name` |
| MCP | 不支持（通过 extensions 扩展） | — |

## Oh My Pi (omp)

聚合多家来源（`src/discovery/index.ts` 注册 native / agents / claude / codex / cursor / opencode / github / mcp-json 等 provider）。

| 类别 | 位置 | 说明 |
|---|---|---|
| Instructions | `~/.omp/agent/AGENTS.md`、最近的 `.omp/AGENTS.md`；`AGENTS.md` / `CLAUDE.md` 向上查找；`~/.agents/AGENTS.md`、`~/.claude/CLAUDE.md`、`~/.codex/AGENTS.md`、`~/.config/opencode/AGENTS.md` | `SYSTEM.md` 替换系统提示 |
| Rules | `.omp/rules`、`~/.omp/agent/rules`（`.md` / `.mdc`）；`RULES.md` sticky always-apply；`.agents/rules`、`~/.agents/rules`；`.cursor/rules`、`~/.cursor/rules`；`.github/instructions/*.instructions.md` | frontmatter 与 Cursor 同（alwaysApply / globs / description） |
| Skills | `.omp/skills`（向上到 repo 根）、`~/.omp/agent/skills`、`~/.omp/agent/managed-skills`（auto-learn）；`.agents|.agent/skills`；`.claude/skills`（project 默认开）、`~/.claude/skills`（`skills.enableClaudeUser` 默认 **关**）；`.codex/skills`、`~/.codex/skills`（`skills.enableCodexUser` 默认 **关**） | 每个根**只扫一层**；`hide: true` / `disable-model-invocation: true` → 不进系统提示（仅 `/skill:`）；`enabled: false` 不加载；`skills.ignoredSkills` glob、`disabledExtensions: ["skill:<name>"]` 禁用 |
| MCP | `~/.omp/agent/mcp.json`、`.omp/mcp.json`（及 `.mcp.json` 变体）、根目录 `mcp.json` / `.mcp.json`、`.cursor/mcp.json`、`~/.cursor/mcp.json`、Codex `config.toml` | server `enabled: false` 禁用 |

设置文件 `~/.omp/agent/config.yml`。

## 开放问题

- Copilot MCP 禁用状态的持久化字段未公开 → 一期标「已配置」。
- Cursor IDE 的 Customize 开关（rules / skills / MCP 启停）存在 Cursor 本地数据库，插件读不到；仅读取 CLI 的 `mcp-disabled.json`。
- Pi project trust（`trust.json`）格式未文档化 → 不判定。
