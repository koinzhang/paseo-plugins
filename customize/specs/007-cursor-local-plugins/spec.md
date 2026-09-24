# Cursor 本地插件扫描

Customize 的 Cursor 插件分类列出 `~/.cursor/plugins/local/<插件名>` 下的本地测试插件，以便查看 Agent Plugins 规范标识。

## 验收

- 每个直接子目录中的根 `plugin.json` 或 `.cursor-plugin/plugin.json` 列为用户级插件条目。
- 有效的标准根清单显示对应 Agent Plugins 规范版本；Cursor 专有清单不显示该标识。
- 不推断 Cursor 是否启用插件；项目级扫描保持原有行为。
