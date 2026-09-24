# 依据

- [Agent Plugins Specification §5.2](https://agent-plugins.org/specification)：`plugin.json` 的 `$schema` 选择版本对应的清单验证规则；未知版本不能当成已支持版本加载，验证时不能在线拉取 schema。
- [Agent Plugins Specification §10.1](https://agent-plugins.org/specification)：`$schema` 声明规范版本，规范文本、清单 schema 和 MCP schema 使用同一版本号；既有 canonical 标识不会被重定义。
- Customize 是只读配置检查器，因此可以显示未知 canonical 版本的“声明版本，未校验”提示，而不执行或声称校验通过。
