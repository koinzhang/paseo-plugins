# 依据

`MECHANISMS[provider][category].supported` 在当前实现中表示有已验证的磁盘扫描位置；例如 Cline commands、Kilo plugins、Trae plugins 虽然有产品能力，仍为 `false`。因此可见性需要独立于扫描状态。ACP 能力证据见 [003 research](../003-acp-configurations/research.md)。未核实的能力保持隐藏，不推断产品绝对不支持。

补充依据：

- [OpenCode commands](https://dev.opencode.ai/docs/commands/)、[agents](https://opencode.ai/docs/agents)、[plugins](https://dev.opencode.ai/docs/plugins/) 确认三个特殊分类。
- [GitHub Copilot CLI 自定义概览](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/overview) 确认 custom agents/subagents 和 plugins。
- [OpenAI Plugins 文档](https://developers.openai.com/plugins/build/plugins) 确认 Codex plugin 包；本地 Codex 已启用 subagent 工具。
- [Claude Code 官方插件结构](https://github.com/anthropics/claude-code/blob/main/plugins/plugin-dev/skills/plugin-structure/SKILL.md) 列出 agents、commands、skills、MCP 与插件 manifest。
- [Pi prompt templates](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/prompt-templates.md)、[extensions](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md)、[packages](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/packages.md) 确认用户可配置的模板和扩展包。
- [Oh My Pi slash command 发现](https://github.com/can1357/oh-my-pi/blob/main/docs/slash-command-internals.md)、[插件加载](https://github.com/can1357/oh-my-pi/blob/main/docs/plugin-manager-installer-plumbing.md)、[子代理源码结构](https://github.com/can1357/oh-my-pi/blob/main/packages/coding-agent/DEVELOPMENT.md) 确认三个特殊分类。

Claude 的 `.claude/commands/*.md` 已由现有扫描器归入 Skills，故不重复展示 Commands；Copilot 的 `.claude/commands` 同理。Pi 的 prompt templates 属于 Commands，extensions/packages 属于 Plugins；第三方扩展实现的 subagent 暂不作为原生配置分类。
