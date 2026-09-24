# 依据

- [Agent Plugins Specification 1.0.0](https://agent-plugins.org/specification)：根 `plugin.json` 为唯一可移植清单；`$schema` 和 `name` 必填；未知顶层字段忽略，非对象 `extensions` 忽略；Skills 和 MCP 使用固定位置。格式标识只验证清单，不能证明组件或运行时完全符合规范。
- [官方清单 schema](https://agent-plugins.org/schemas/1.0.0/plugin.schema.json)：名称长度与字符约束，以及可选元数据的类型。
- [OpenAI 插件打包文档](https://developers.openai.com/plugins/build/plugins)：Codex 支持标准根清单，`.codex-plugin/plugin.json` 为兼容回退；示例本地目录是 `~/.codex/plugins`，marketplace 可以指向其他来源。本机另外观察到 `$CODEX_HOME/plugins/cache/<source>/<plugin>/<version>` 缓存布局；该布局不是通用规范。
- [Cursor 插件参考](https://prod.cursor.com/docs/reference/plugins)：标准格式使用根 `plugin.json`；Cursor 专有格式使用 `.cursor-plugin/plugin.json`。
- [Gemini CLI 扩展参考](https://geminicli.com/docs/extensions/reference/)：已有扩展位置为 `~/.gemini/extensions`，原生清单是 `gemini-extension.json`。Customize 仅在同目录存在有效标准根清单时标识，不据此推断 Gemini CLI 已加载标准格式。
