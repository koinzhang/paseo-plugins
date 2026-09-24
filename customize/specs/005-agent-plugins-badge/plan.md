# 方案

1. 服务端用离线的 Agent Plugins 1.0 清单校验器识别根 `plugin.json`；按规范对未知顶层字段和非对象 `extensions` 做容错，其余字段校验类型和名称约束。
2. 在 Codex、Cursor、Gemini 的插件条目上附加格式 tag；Codex 扫描 `$CODEX_HOME/plugins` 的直接子目录、`plugins/cache/<来源>/<插件>/<版本>` 和当前项目根目录，Cursor 扫描项目根目录，Gemini 扫描既有扩展目录和当前项目根目录。
3. 客户端在插件条目标题旁显示格式标识，预览元数据也保留此信息。
4. 测试有效、无效、未知版本和专有清单；类型检查、测试并重载 Customize。
