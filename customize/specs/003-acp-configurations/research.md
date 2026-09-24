# Research

Paseo 本地源码 `../paseo/packages/app/src/data/acp-provider-catalog.ts`，HEAD `49f9cec6be01ef7e7604dadf127425eac6493820`，本机 `paseo 0.9.1`。ID：`cline`、`codebuddy-code`、`cursor`、`gemini`、`goose`、`grok`、`kilo`、`kiro`、`kimi`、`qwen-code`、`traecli`。以下为当前官方文档位置；文档可能比 catalog 中固定 CLI 版本新。

| Provider | 已确认机制与来源 | 边界 |
|---|---|---|
| Cline | [CLI 配置表](https://github.com/cline/cline/blob/main/docs/cli/cli-reference.mdx)、[rules](https://github.com/cline/cline/blob/main/docs/customization/cline-rules.mdx)、[skills](https://github.com/cline/cline/blob/main/docs/customization/skills.mdx)、[plugins](https://github.com/cline/cline/blob/main/.agents/skills/cline-sdk/references/plugins/REFERENCE.md) | CLI 有 `.cline/agents.yaml` 和 `.cline/plugins`；MCP 文档与 [issue #11671](https://github.com/cline/cline/issues/11671) 路径不一致，扫描两种候选。 |
| CodeBuddy Code | [SDK 位置表](https://www.codebuddy.cn/docs/cli/sdk)、[目录结构](https://www.codebuddy.cn/docs/cli/codebuddy-dir)、[插件](https://www.codebuddy.cn/docs/cli/plugins-reference) | CLI 直接运行加载 rules、skills、commands、subagents；SDK 默认不加载。 |
| Cursor | [CLI](https://docs.cursor.com/en/cli/using)、[commands](https://docs.cursor.com/en/agent/chat/commands)、[官方论坛确认用户 commands](https://forum.cursor.com/t/how-to-use-slash-commands-w-cursor-cli/149995)、[subagents](https://prod.cursor.com/docs/subagents)、[plugins](https://prod.cursor.com/docs/reference/plugins) | 插件 manifest `.cursor-plugin/plugin.json`；启用状态无法单凭 manifest 判定。 |
| Gemini CLI | [context](https://geminicli.com/docs/cli/gemini-md/)、[skills](https://geminicli.com/docs/cli/using-agent-skills/)、[MCP](https://geminicli.com/docs/tools/mcp-server/)、[commands](https://geminicli.com/docs/cli/custom-commands/)、[subagents](https://geminicli.com/docs/core/subagents/)、[extensions](https://geminicli.com/docs/extensions/) | `AGENTS.md` 仅在 `context.fileName` 指定时按 Gemini 规则加载；无独立 rules 目录证据。 |
| Goose | [hints](https://goose-docs.ai/docs/guides/context-engineering/using-goosehints/)、[skills](https://goose-docs.ai/docs/guides/context-engineering/using-skills/)、[agents](https://goose-docs.ai/docs/guides/context-engineering/custom-agents/)、[commands](https://goose-docs.ai/docs/guides/context-engineering/slash-commands/)、[extensions](https://goose-docs.ai/docs/guides/config-files/)、[plugins](https://goose-docs.ai/docs/guides/context-engineering/hooks/) | MCP 通过 `~/.config/goose/config.yaml → extensions`，commands 通过 `slash_commands`；未找到独立 rules 文件格式。 |
| Grok Build | [skills/plugins/compat](https://docs.x.ai/build/features/skills-plugins-marketplaces)、[subagents](https://docs.x.ai/build/features/subagents)、[MCP](https://docs.x.ai/build/features/mcp-servers)、[settings](https://docs.x.ai/build/settings)、[CLI inspect](https://docs.x.ai/build/cli/reference) | `grok inspect` 为运行时事实；磁盘扫描无法完全重建插件启用及 MCP 状态。 |
| Kilo Code | [AGENTS.md](https://kilo.ai/docs/customize/agents-md)、[skills](https://kilo.ai/docs/customize/skills)、[subagents](https://kilo.ai/docs/customize/custom-subagents)、[MCP](https://kilo.ai/docs/automate/mcp/using-in-kilo-code)、[commands](https://kilo.ai/articles/claude-code-to-kilo-code-migration-guide) | 配置可在 `kilo.jsonc`；Marketplace 组件未找到可靠本地插件清单位置。 |
| Kiro CLI | [configuration scopes](https://kiro.dev/docs/cli/chat/configuration/)、[skills](https://kiro.dev/docs/skills/) | steering 是规则；powers 是扩展；未找到文件化自定义 command 证据。 |
| Kimi Code | [data locations](https://github.com/MoonshotAI/kimi-code/blob/main/docs/en/configuration/data-locations.md)、[skills](https://github.com/MoonshotAI/kimi-code/blob/main/docs/en/customization/skills.md)、[plugins](https://github.com/MoonshotAI/kimi-code/blob/main/docs/en/customization/plugins.md) | 用户目录随 `KIMI_CODE_HOME` 变化；plugin commands 与 agents 由 manifest 声明。 |
| Qwen Code | [settings](https://github.com/QwenLM/qwen-code/blob/main/docs/users/configuration/settings.md)、[subagents](https://github.com/QwenLM/qwen-code/blob/main/docs/users/features/sub-agents.md)、[extensions](https://github.com/QwenLM/qwen-code/blob/main/docs/users/extension/introduction.md)、[rules](https://qwenlm.github.io/qwen-code-docs/en/users/features/rules/) | Paseo 启动参数包含 `--experimental-skills`。 |
| TraeCode CLI | [AGENTS/rules](https://docs.trae.cn/cli_memories)、[skills](https://docs.trae.cn/cli_skills)、[commands](https://docs.trae.cn/cli_slash-commands)、[agents](https://docs.trae.cn/cli_agent)、[MCP](https://docs.trae.cn/cli_model-context-protocol)、[global config](https://docs.trae.cn/cli_global-settings)、[plugins](https://docs.trae.cn/cli_tools-and-extensions) | 官方区分 `.traecli` 原生目录与 `.trae` / `.trae-cn` IDE 兼容目录；CLI 全局 MCP YAML 路径依操作系统变化。 |

## 特殊配置支持

`✓` 表示官方资料确认能力及可扫描位置；`◐` 表示确认能力但只掌握部分磁盘位置或运行时状态；`?` 表示未核实。Rules 指独立规则文件，AGENTS.md 归入 Instructions。

| Provider | Instructions / AGENTS.md | Skills | Rules | MCP | Commands | Subagents | Plugins / 扩展 |
|---|---|---|---|---|---|---|---|
| Cursor | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ |
| Cline | ✓ | ✓ | ✓ | ✓ | ◐ 插件 API | ✓ agents.yaml | ✓ |
| CodeBuddy Code | ✓ CODEBUDDY.md；AGENTS.md ? | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ |
| Gemini CLI | ◐ context.fileName | ✓ | ? | ✓ | ✓ | ✓ | ◐ extensions |
| Goose | ✓ | ✓ | ? | ✓ extensions | ✓ | ✓ | ✓ |
| Grok Build | ✓ | ✓ | ✓ Claude 兼容 | ✓ | ◐ | ◐ | ◐ |
| Kilo Code | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ marketplace |
| Kiro CLI | ✓ | ✓ | ✓ steering | ✓ | ? | ✓ | ◐ powers |
| Kimi Code | ✓ | ✓ | ? | ✓ | ✓ plugin | ✓ | ◐ |
| Qwen Code | ✓ QWEN.md | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ extensions |
| TraeCode CLI | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ |

“未验证”表示未找到足以实现磁盘扫描的官方依据，不等同于产品不支持。
