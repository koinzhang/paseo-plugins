# 依据

- [Cursor 官方插件文档](https://prod.cursor.com/docs/plugins) 的“Test plugins locally”：本地测试插件存放在 `~/.cursor/plugins/local/<插件名>`；标准包使用根 `plugin.json`，Cursor 专有格式使用 `.cursor-plugin/plugin.json`。Cursor 需要重启或 `Developer: Reload Window` 才会加载插件，Customize 仅读取磁盘清单。
- [Agent Plugins 1.0 规范](https://agent-plugins.org/specification)：标准包根目录必须有 `plugin.json`；`skills/<name>/SKILL.md` 是可选组件。
