# Customize specs

| 编号 | 目录 | 主题 | 状态 |
|---|---|---|---|
| 001 | [`001-customize-board`](./001-customize-board/) | 右上角 Customize 入口 + 按 provider / project 列出 instructions、rules、skills、MCP | 已实现 |
| 002 | [`002-enabled-providers`](./002-enabled-providers/) | 只显示已启用且受支持的 Provider，并标明 Built-in / ACP | 已实现 |
| 003 | [`003-acp-configurations`](./003-acp-configurations/) | 扩展 ACP Provider 配置发现及 commands、subagents、plugins | 已实现 |
| 004 | [`004-provider-category-visibility`](./004-provider-category-visibility/) | 按 Provider 能力显示配置分类 | 已实现 |
| 005 | [`005-agent-plugins-badge`](./005-agent-plugins-badge/) | 识别 Agent Plugins 1.0 清单并标识插件条目 | 已实现 |
| 006 | [`006-scan-cache`](./006-scan-cache/) | 保留 Provider 扫描结果，进入页面和切换时静默刷新 | 已实现 |
| 007 | [`007-cursor-local-plugins`](./007-cursor-local-plugins/) | 扫描 Cursor 本地测试插件目录 | 已实现 |
| 008 | [`008-agent-plugin-schema-version`](./008-agent-plugin-schema-version/) | 从标准清单读取规范版本并标明未支持版本 | 已实现 |
| 009 | [`009-persistent-scan-cache`](./009-persistent-scan-cache/) | 持久化扫描快照，过期后静默刷新 | 已实现 |
| 010 | [`010-skill-aliases-and-compatibility`](./010-skill-aliases-and-compatibility/) | 按实体文件合并 skill 别名，展示第三方目录兼容状态 | 已实现 |
| 011 | [`011-slash-command`](./011-slash-command/) | `/customize` 从当前 agent 打开看板并选择 Provider / Project | 已实现 |
| 012 | [`012-sticky-category`](./012-sticky-category/) | 切换 Provider / Project 时保持分类，缺失时回到第一项 | 已实现 |

规则同仓库根 `AGENTS.md`：先改 spec / plan 再改代码；每完成一个 task 在 `tasks.md` 勾选并写验证方式；新功能点新开编号目录。
