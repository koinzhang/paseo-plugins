# Customize 0.1.0

First release of Customize. Requires Paseo 0.9.0 or newer.

Customize shows local agent configuration for a selected provider and project in one board. It covers instructions, rules, skills, MCP servers, commands, subagents, and plugins, with project and user sources separated and an explanation of how each provider loads them.

- Open it from the sidebar, Command Center, or `/customize` in an agent composer. The command selects the agent's provider and workspace project when available.
- See whether an item loads automatically, conditionally, manually, with approval, or is disabled or ignored, with the relevant configuration reason.
- Preview files and open or reveal their paths. MCP previews mask secret values.
- Return to saved scan results after a restart; Customize refreshes old snapshots in the background and offers a manual Rescan.
- Inspect supported provider compatibility with shared skill directories, deduplicated skill aliases, and Agent Plugins manifest versions.

Install with `paseo plugin add koinzhang/paseo-plugins --path customize`.

Customize reads files on the local host. Its list reflects disk evidence; a running agent may differ because of trust, command-line flags, plugin enablement, or provider version.
