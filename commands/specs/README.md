# Commands specs

| 编号 | 目录 | 主题 | 状态 |
|---|---|---|---|
| 001 | [`001-agent-commands`](./001-agent-commands/) | `/model` `/effort` `/profile` `/mode` `/feature` `/rename` `/cancel` 控制当前 agent | 已实现 |
| 002 | [`002-command-settings`](./002-command-settings/) | Settings 页逐个开关 slash command 并说明用途 | 已实现 |
| 003 | [`003-resend-command`](./003-resend-command/) | `/resend` 原样重发当前会话最近一条用户 prompt | 已实现 |
| 004 | [`004-rename-targets`](./004-rename-targets/) | `/rename` 默认改当前 tab，`-w` 改 workspace | 已实现 |

规则同仓库根 `AGENTS.md`：先改 spec / plan 再改代码；每完成一个 task 在 `tasks.md` 勾选并写验证方式；新功能点新开编号目录。
