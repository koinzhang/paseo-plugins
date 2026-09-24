# Agent Plugins 1.0.0 标识

Customize 在插件分类中标识具有有效 Agent Plugins 1.0.0 根清单的本地插件，方便区分标准包和 Provider 专有插件包。后续版本的显示规则见 `008-agent-plugin-schema-version`。

## 验收

- Codex、Cursor、Gemini 已扫描位置中的插件，若根目录 `plugin.json` 声明 Agent Plugins 1.0.0 且核心清单字段有效，列表显示「Agent Plugins 1.0.0」标识。
- `.cursor-plugin/plugin.json`、`gemini-extension.json` 等专有清单不得仅凭文件名获得标识；无效的 1.0.0 根清单也不得获得标识。未知版本仅显示声明版本和未校验状态，见 008。
- 标识仅说明清单格式，不推断启用状态，也不声称对 Skill/MCP 组件或运行时做了完整验证。
- 保留现有专有插件扫描结果和状态；Codex 本地插件目录及项目根目录的标准清单可出现在插件分类。
