import { ACP_CONFIGS, type AcpConfig, type AcpProviderId } from "./acp-configs.ts";
import { CATEGORIES, type Category, type Scope } from "./contracts.ts";
import { PROVIDER_IDS, type ProviderId } from "./providers.ts";

/** Bilingual static copy; the client picks by app language. */
export type Localized = { en: string; zh: string };

export interface Mechanism {
  supported: boolean;
  locations: ReadonlyArray<{ scope: Scope | "managed"; path: string }>;
  /** Discovery facts: recursion, precedence, and how auto-discovery is turned off. */
  notes: readonly Localized[];
}

const L = (en: string, zh: string): Localized => ({ en, zh });

const UNSUPPORTED = (en: string, zh: string): Mechanism => ({ supported: false, locations: [], notes: [L(en, zh)] });

const UNVERIFIED = UNSUPPORTED("No verified disk discovery location yet.", "尚未核实可扫描的磁盘配置位置。");

const ACP_NOTES: Partial<Record<AcpProviderId, Partial<Record<Category, Localized>>>> = {
  cline: {
    mcp: L("CLI and extension documentation disagree on the user MCP path; both documented candidates are scanned.", "CLI 与扩展文档对用户 MCP 路径有分歧；扫描两个已记录的候选路径。"),
    commands: L("Plugins can register commands, but no standalone command file directory was verified.", "插件可注册命令，但未核实独立命令文件目录。"),
  },
  "codebuddy-code": { plugins: L("Marketplace plugins are copied into a versioned cache; settings decide whether each is enabled.", "市场插件复制到带版本的缓存；是否启用由 settings 决定。") },
  gemini: {
    instructions: L("AGENTS.md loads only when context.fileName in settings.json includes it.", "只有 settings.json 的 context.fileName 包含 AGENTS.md 时才加载。"),
    rules: L("No separate rules directory is documented; use context files.", "官方未记录独立 rules 目录；使用上下文文件。"),
    plugins: L("Scans installed extensions and a root Agent Plugins manifest in the current project. The badge validates manifest fields only, not activation or bundled components.", "扫描已安装扩展及当前项目根目录的 Agent Plugins 清单。标识只校验清单字段，不代表已启用或组件全部有效。"),
  },
  goose: { mcp: L("MCP servers are stdio or HTTP extensions in config.yaml.", "MCP Server 是 config.yaml 中的 stdio 或 HTTP extension。"), commands: L("Custom slash commands map to recipes through config.yaml slash_commands.", "自定义斜杠命令通过 config.yaml 的 slash_commands 映射到 recipe。") },
  grok: { plugins: L("grok inspect reports runtime plugin discovery; disk entries alone do not prove activation.", "grok inspect 可查看运行时插件发现结果；磁盘条目不能证明已启用。") },
  kilo: { plugins: L("Marketplace components exist, but no reliable local plugin manifest location was verified.", "支持 Marketplace 组件，但尚未核实可靠的本地插件清单位置。") },
  kiro: { rules: L("Steering files are rules; custom agents may need explicit resources to load them.", "Steering 文件是规则；自定义 agent 可能要在 resources 中显式引用。"), plugins: L("Powers are Kiro extension packages, not generic plugin manifests.", "Powers 是 Kiro 扩展包，并非通用插件 manifest。") },
  kimi: { commands: L("Plugin manifests declare command directories; only those files are listed.", "插件 manifest 声明命令目录；只列出这些目录里的文件。") },
  "qwen-code": { plugins: L("Extensions can package skills, commands, agents, and MCP servers.", "Extension 可打包 skills、commands、agents 与 MCP Server。") },
  traecli: { plugins: L("The CLI supports plugins, but its local install directory was not verified.", "CLI 支持插件，但尚未核实本地安装目录。") },
};

/** Sources: specs/001-customize-board/research.md and specs/003-acp-configurations/research.md. */
const BASE_MECHANISMS: Partial<Record<ProviderId, Partial<Record<Category, Mechanism>>>> = {
  claude: {
    instructions: {
      supported: true,
      locations: [
        { scope: "managed", path: "/Library/Application Support/ClaudeCode/CLAUDE.md" },
        { scope: "user", path: "~/.claude/CLAUDE.md" },
        { scope: "project", path: "CLAUDE.md · .claude/CLAUDE.md · CLAUDE.local.md (cwd + parents)" },
        { scope: "project", path: "AGENTS.md" },
      ],
      notes: [
        L("Files in the working directory and every parent load at launch; subdirectory CLAUDE.md files load on demand.", "工作目录及所有上级目录的文件启动时加载；子目录里的 CLAUDE.md 在读取该目录文件时按需加载。"),
        L("AGENTS.md is read only when no CLAUDE.md / CLAUDE.local.md exists in the working directory or above.", "只有 cwd 及以上都没有 CLAUDE.md / CLAUDE.local.md 时才读取 AGENTS.md。"),
        L("Skip files with `claudeMdExcludes` (glob) in settings.", "settings 中的 `claudeMdExcludes`（glob）可排除文件。"),
      ],
    },
    rules: {
      supported: true,
      locations: [
        { scope: "user", path: "~/.claude/rules/**/*.md" },
        { scope: "project", path: ".claude/rules/**/*.md" },
      ],
      notes: [
        L("Recursive: every .md under rules/ (subfolders included).", "递归：rules/ 下所有 .md（含子目录）。"),
        L("`paths:` frontmatter loads a rule only for matching files; otherwise it always loads.", "frontmatter `paths:` 只在匹配文件时加载，否则每次都加载。"),
      ],
    },
    skills: {
      supported: true,
      locations: [
        { scope: "user", path: "~/.claude/skills/<name>/SKILL.md" },
        { scope: "project", path: ".claude/skills/<name>/SKILL.md (cwd → repo root)" },
        { scope: "project", path: "<subdir>/.claude/skills (on demand)" },
        { scope: "project", path: ".claude/commands/*.md" },
      ],
      notes: [
        L("One level per skills root (no recursion into category folders); symlinked skill folders are followed.", "每个 skills 根只扫一层（不递归分类目录）；跟随符号链接。"),
        L("`disable-model-invocation: true` → manual only; `user-invocable: false` hides it from the / menu.", "`disable-model-invocation: true` → 仅手动；`user-invocable: false` → 不出现在 / 菜单。"),
        L("`skillOverrides` in settings: off / user-invocable-only / name-only.", "settings 的 `skillOverrides`：off / user-invocable-only / name-only。"),
      ],
    },
    mcp: {
      supported: true,
      locations: [
        { scope: "user", path: "~/.claude.json → mcpServers" },
        { scope: "project", path: "~/.claude.json → projects[<path>].mcpServers (local)" },
        { scope: "project", path: ".mcp.json" },
        { scope: "managed", path: "managed-mcp.json" },
      ],
      notes: [
        L("Project .mcp.json servers need approval: enableAllProjectMcpServers / enabledMcpjsonServers; disabledMcpjsonServers rejects.", "项目 .mcp.json 需批准：enableAllProjectMcpServers / enabledMcpjsonServers；disabledMcpjsonServers 拒绝。"),
        L("`/mcp` toggles are stored per project in ~/.claude.json disabledMcpServers.", "`/mcp` 开关按项目存在 ~/.claude.json 的 disabledMcpServers。"),
      ],
    },
  },
  codex: {
    instructions: {
      supported: true,
      locations: [
        { scope: "user", path: "$CODEX_HOME/AGENTS.override.md | AGENTS.md" },
        { scope: "project", path: "AGENTS.override.md | AGENTS.md | fallbacks (git root → cwd)" },
      ],
      notes: [
        L("At most one file per directory: AGENTS.override.md, then AGENTS.md, then project_doc_fallback_filenames.", "每级目录至多一个：AGENTS.override.md > AGENTS.md > project_doc_fallback_filenames。"),
        L("Combined size is capped by project_doc_max_bytes (32 KiB default).", "合并大小受 project_doc_max_bytes 限制（默认 32 KiB）。"),
      ],
    },
    rules: {
      supported: true,
      locations: [
        { scope: "user", path: "$CODEX_HOME/rules/*.rules" },
        { scope: "project", path: ".codex/rules/*.rules (trusted projects)" },
      ],
      notes: [
        L("Codex rules are command-approval policy (Starlark prefix_rule), not prompt instructions.", "Codex rules 是命令审批策略（Starlark prefix_rule），不是提示词规则。"),
      ],
    },
    skills: {
      supported: true,
      locations: [
        { scope: "project", path: ".agents/skills (cwd → repo root)" },
        { scope: "project", path: ".codex/skills" },
        { scope: "user", path: "~/.agents/skills" },
        { scope: "user", path: "$CODEX_HOME/skills (deprecated) · skills/.system" },
        { scope: "managed", path: "/etc/codex/skills" },
      ],
      notes: [
        L("Recursive up to 6 levels; hidden folders are skipped; symlinks are followed.", "递归扫描，最深 6 层；跳过隐藏目录；跟随符号链接。"),
        L("agents/openai.yaml `policy.allow_implicit_invocation: false` → explicit $skill only.", "agents/openai.yaml `policy.allow_implicit_invocation: false` → 只能显式 $skill。"),
        L("`[[skills.config]] path = … enabled = false` in config.toml disables a skill.", "config.toml 中 `[[skills.config]] path = … enabled = false` 禁用。"),
      ],
    },
    mcp: {
      supported: true,
      locations: [
        { scope: "user", path: "$CODEX_HOME/config.toml → [mcp_servers.*]" },
        { scope: "project", path: ".codex/config.toml (trusted projects)" },
      ],
      notes: [L("`enabled = false` disables a server.", "`enabled = false` 禁用 server。")],
    },
    plugins: {
      supported: true,
      locations: [{ scope: "project", path: "plugin.json · .codex-plugin/plugin.json" }, { scope: "user", path: "$CODEX_HOME/plugins/* · plugins/cache/<source>/<plugin>/<version>" }],
      notes: [L("Only these local plugin locations are scanned; marketplace sources elsewhere are not enumerated. The Agent Plugins badge shows the declared schema version; unsupported versions are unverified.", "仅扫描这些本地插件位置；其他 marketplace 来源不逐一列出。Agent Plugins 标识显示清单声明的规范版本；未支持版本标为未校验。")],
    },
  },
  cursor: {
    instructions: {
      supported: true,
      locations: [
        { scope: "project", path: "AGENTS.md (root + any subdirectory)" },
        { scope: "project", path: "CLAUDE.md · CLAUDE.local.md · .cursorrules (legacy)" },
      ],
      notes: [
        L("Nested AGENTS.md applies to files in that directory and below.", "嵌套 AGENTS.md 作用于该目录及其子目录。"),
        L("User Rules live in Cursor settings (not on disk) and are not shown.", "User Rules 存在 Cursor 设置里（非文件），不在此展示。"),
      ],
    },
    rules: {
      supported: true,
      locations: [{ scope: "project", path: ".cursor/rules/**/*.mdc (nested .cursor/rules too)" }],
      notes: [
        L("Recursive; plain .md files in rules/ are ignored.", "递归；rules/ 里的 .md 会被忽略。"),
        L("alwaysApply → Always · globs → auto-attached · description only → Agent decides · none → @mention only.", "alwaysApply → 总是 · globs → 匹配时附加 · 仅 description → Agent 决定 · 都没有 → 仅 @ 手动。"),
      ],
    },
    skills: {
      supported: true,
      locations: [
        { scope: "project", path: ".agents/skills · .cursor/skills · .claude/skills · .codex/skills" },
        { scope: "user", path: "~/.agents/skills · ~/.cursor/skills · ~/.claude/skills · ~/.codex/skills" },
        { scope: "user", path: "~/.cursor/skills-cursor (built-in)" },
      ],
      notes: [
        L("Recursive: any SKILL.md below a skills root; nested project skills are scoped to their directory.", "递归：skills 根下任意层级的 SKILL.md；仓库子目录中的 skills 自动限定到该目录。"),
        L("`disable-model-invocation: true` → /skill only; `paths` (legacy `globs`) → only for matching files.", "`disable-model-invocation: true` → 仅 /skill；`paths`（旧 `globs`）→ 匹配文件时。"),
      ],
    },
    mcp: {
      supported: true,
      locations: [
        { scope: "user", path: "~/.cursor/mcp.json" },
        { scope: "project", path: ".cursor/mcp.json" },
      ],
      notes: [
        L("`agent mcp disable` writes ~/.cursor/projects/<slug>/mcp-disabled.json; IDE toggles are not readable.", "`agent mcp disable` 写入 ~/.cursor/projects/<slug>/mcp-disabled.json；IDE 内的开关读不到。"),
      ],
    },
    commands: { supported: true, locations: [{ scope: "project", path: ".cursor/commands/**/*.md" }, { scope: "user", path: "~/.cursor/commands/**/*.md" }], notes: [L("Markdown slash commands; nested folders inside commands/ are allowed.", "Markdown 斜杠命令；commands/ 内支持嵌套目录。") ] },
    subagents: { supported: true, locations: [{ scope: "project", path: ".cursor/agents · .claude/agents · .codex/agents" }, { scope: "user", path: "~/.cursor/agents · ~/.claude/agents · ~/.codex/agents" }], notes: [L("Agent definitions use Markdown with frontmatter; Claude and Codex directories are read for compatibility.", "子代理使用带 frontmatter 的 Markdown；兼容 Claude 和 Codex 目录。") ] },
    plugins: { supported: true, locations: [{ scope: "project", path: "plugin.json · .cursor-plugin/plugin.json" }, { scope: "user", path: "~/.cursor/plugins/local/*/plugin.json · .cursor-plugin/plugin.json" }], notes: [L("Local test plugins are discovered from ~/.cursor/plugins/local. The badge uses the root manifest's declared schema version; unsupported versions are unverified.", "从 ~/.cursor/plugins/local 发现本地测试插件。标识使用根清单声明的规范版本；未支持版本标为未校验。") ] },
  },
  copilot: {
    instructions: {
      supported: true,
      locations: [
        { scope: "project", path: "AGENTS.md · CLAUDE.md · GEMINI.md · .github/copilot-instructions.md" },
        { scope: "user", path: "~/.copilot/copilot-instructions.md" },
      ],
      notes: [L("Read from the git root and cwd; --no-custom-instructions turns them off.", "读取 git 根与 cwd；--no-custom-instructions 关闭。")],
    },
    rules: {
      supported: true,
      locations: [
        { scope: "project", path: ".github/instructions/**/*.instructions.md" },
        { scope: "user", path: "~/.copilot/instructions/**/*.instructions.md" },
      ],
      notes: [L("`applyTo` frontmatter scopes an instruction to matching files.", "frontmatter `applyTo` 限定匹配文件。")],
    },
    skills: {
      supported: true,
      locations: [
        { scope: "project", path: ".github/skills · .agents/skills · .claude/skills" },
        { scope: "user", path: "~/.copilot/skills · ~/.agents/skills" },
        { scope: "project", path: ".claude/commands/*.md" },
      ],
      notes: [
        L("First found wins for duplicate names.", "同名 skill 先找到的优先。"),
        L("`disable-model-invocation: true` → manual only; `user-invocable: false` hides it from /.", "`disable-model-invocation: true` → 仅手动；`user-invocable: false` → 不出现在 /。"),
      ],
    },
    mcp: {
      supported: true,
      locations: [
        { scope: "user", path: "~/.copilot/mcp-config.json" },
        { scope: "project", path: ".mcp.json · .github/mcp.json (trusted folder)" },
      ],
      notes: [L("/mcp disable persists in user config; the field is undocumented, so disabled state is not shown.", "/mcp disable 写入用户配置，字段未公开，暂不显示禁用状态。")],
    },
  },
  opencode: {
    instructions: {
      supported: true,
      locations: [
        { scope: "project", path: "AGENTS.md, else CLAUDE.md (cwd → worktree)" },
        { scope: "user", path: "~/.config/opencode/AGENTS.md, else ~/.claude/CLAUDE.md" },
      ],
      notes: [
        L("First match wins in each scope.", "每个范围只取第一个匹配。"),
        L("OPENCODE_DISABLE_CLAUDE_CODE(_PROMPT) turns off the Claude fallbacks.", "OPENCODE_DISABLE_CLAUDE_CODE(_PROMPT) 关闭 Claude 兼容。"),
      ],
    },
    rules: {
      supported: true,
      locations: [{ scope: "project", path: "opencode.json → instructions[] (paths, globs, URLs)" }],
      notes: [L("OpenCode calls AGENTS.md “rules”; extra rule files come from `instructions`.", "OpenCode 把 AGENTS.md 称作 rules；额外规则文件来自 `instructions`。")],
    },
    skills: {
      supported: true,
      locations: [
        { scope: "project", path: ".opencode/skills · .claude/skills · .agents/skills (cwd → worktree)" },
        { scope: "user", path: "~/.config/opencode/skills · ~/.claude/skills · ~/.agents/skills" },
      ],
      notes: [
        L("One level (skills/*/SKILL.md); no manual-only flag.", "只扫一层（skills/*/SKILL.md）；没有仅手动标记。"),
        L("`permission.skill` patterns: deny hides a skill, ask prompts first.", "`permission.skill` 通配：deny 隐藏，ask 先确认。"),
      ],
    },
    mcp: {
      supported: true,
      locations: [
        { scope: "user", path: "~/.config/opencode/opencode.json(c) → mcp" },
        { scope: "project", path: "opencode.json(c) · .opencode/opencode.json(c) → mcp" },
      ],
      notes: [L("`enabled: false` disables a server.", "`enabled: false` 禁用 server。")],
    },
  },
  pi: {
    instructions: {
      supported: true,
      locations: [
        { scope: "user", path: "~/.pi/agent/AGENTS.md · SYSTEM.md · APPEND_SYSTEM.md" },
        { scope: "project", path: "AGENTS.md | CLAUDE.md (cwd + parents) · .pi/SYSTEM.md" },
      ],
      notes: [
        L("AGENTS.override.md replaces AGENTS.md / CLAUDE.md in the same directory only.", "AGENTS.override.md 只替代同一目录的 AGENTS.md / CLAUDE.md。"),
        L("SYSTEM.md replaces the system prompt; APPEND_SYSTEM.md appends to it.", "SYSTEM.md 替换系统提示；APPEND_SYSTEM.md 追加。"),
      ],
    },
    rules: UNSUPPORTED("Pi has no rules files; use AGENTS.md or prompt templates.", "Pi 没有 rules 文件；使用 AGENTS.md 或 prompt templates。"),
    skills: {
      supported: true,
      locations: [
        { scope: "user", path: "~/.pi/agent/skills · ~/.agents/skills" },
        { scope: "project", path: ".pi/skills · .agents/skills (cwd → repo root)" },
      ],
      notes: [
        L("Recursive; loose .md files directly in a pi skills root are skills too.", "递归；pi skills 根目录下的独立 .md 也算 skill。"),
        L("`disable-model-invocation: true` → /skill:name only.", "`disable-model-invocation: true` → 仅 /skill:name。"),
      ],
    },
    mcp: UNSUPPORTED("Pi does not support MCP; use extensions.", "Pi 不支持 MCP；使用 extensions。"),
  },
  omp: {
    instructions: {
      supported: true,
      locations: [
        { scope: "user", path: "~/.omp/agent/AGENTS.md · ~/.agents/AGENTS.md · ~/.claude/CLAUDE.md · ~/.codex/AGENTS.md" },
        { scope: "project", path: ".omp/AGENTS.md · AGENTS.md · CLAUDE.md (walk up)" },
      ],
      notes: [L("Aggregates native .omp files and other agents' conventions.", "聚合 .omp 原生文件与其他 agent 的约定。")],
    },
    rules: {
      supported: true,
      locations: [
        { scope: "project", path: ".omp/rules · .agents/rules · .cursor/rules · .github/instructions · .omp/RULES.md" },
        { scope: "user", path: "~/.omp/agent/rules · ~/.agents/rules · ~/.cursor/rules · ~/.omp/agent/RULES.md" },
      ],
      notes: [L("RULES.md is sticky (always applied); other rules follow alwaysApply / globs / description.", "RULES.md 常驻（总是应用）；其他规则按 alwaysApply / globs / description。")],
    },
    skills: {
      supported: true,
      locations: [
        { scope: "project", path: ".omp/skills · .agents/skills · .claude/skills · .codex/skills" },
        { scope: "user", path: "~/.omp/agent/skills · managed-skills · ~/.agents/skills" },
        { scope: "user", path: "~/.claude/skills · ~/.codex/skills (off by default)" },
      ],
      notes: [
        L("One level per root; skills without a description are skipped.", "每个根只扫一层；没有 description 的 skill 不加载。"),
        L("`hide: true` / `disable-model-invocation: true` → /skill only; `enabled: false` skips it.", "`hide: true` / `disable-model-invocation: true` → 仅 /skill；`enabled: false` 不加载。"),
        L("config.yml: skills.enableClaudeUser / enableCodexUser, skills.ignoredSkills, disabledExtensions.", "config.yml：skills.enableClaudeUser / enableCodexUser、skills.ignoredSkills、disabledExtensions。"),
      ],
    },
    mcp: {
      supported: true,
      locations: [
        { scope: "user", path: "~/.omp/agent/mcp.json · ~/.cursor/mcp.json · ~/.codex/config.toml" },
        { scope: "project", path: ".omp/mcp.json · mcp.json · .mcp.json · .cursor/mcp.json · .codex/config.toml" },
      ],
      notes: [L("`enabled: false` disables a server.", "`enabled: false` 禁用 server。")],
    },
  },
};

function acpMechanisms(id: AcpProviderId): Partial<Record<Category, Mechanism>> {
  const config: AcpConfig = ACP_CONFIGS[id];
  return Object.fromEntries(CATEGORIES.map((category) => {
    const paths = config[category];
    const locations: Mechanism["locations"] = [
      ...(paths.project ?? []).map((p) => ({ scope: "project" as const, path: p })),
      ...(paths.user ?? []).map((p) => ({ scope: "user" as const, path: `~/${p}` })),
    ];
    const specific = ACP_NOTES[id]?.[category];
    const notes = locations.length ? [specific ?? L("Shows local configuration files; actual activation can depend on trust, settings or CLI flags.", "展示本地配置文件；实际启用还可能受信任状态、设置或 CLI 参数影响。")]
      : [specific ?? L("No verified standalone file location for this category.", "此分类尚无已核实的独立文件位置。")];
    return [category, { supported: locations.length > 0, locations, notes }];
  })) as Partial<Record<Category, Mechanism>>;
}

for (const id of Object.keys(ACP_CONFIGS) as AcpProviderId[]) BASE_MECHANISMS[id] = acpMechanisms(id);

export const MECHANISMS = Object.fromEntries(PROVIDER_IDS.map((id) => [
  id, Object.fromEntries(CATEGORIES.map((category) => [category, BASE_MECHANISMS[id]?.[category] ?? UNVERIFIED])),
])) as Record<ProviderId, Record<Category, Mechanism>>;
