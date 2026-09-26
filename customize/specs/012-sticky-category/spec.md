# 012 — 切换时保持分类

切换 Provider 或 Project 时，分类栏继续停留在当前分类。只有新 Provider 不提供该分类时，才改选它的第一个可见分类。

## 目标

- Instructions、Rules、Skills、MCP、Commands、Subagents、Plugins 的选择不按 Provider 分别记忆。
- 新 Provider 仍有当前分类时，分类栏保持不变。
- 新 Provider 没有当前分类（例如 Commands）时，选中该 Provider 的第一个可见分类，并以这个新选择作为之后的当前分类。
- 切换 Project 不改变分类。

## 验收

- 从提供 Skills 的 Provider 切到另一个也提供 Skills 的 Provider 时，分类仍是 Skills。
- 从 Commands 切到不提供 Commands 的 Provider 时，分类变为该 Provider 的第一个可见分类。
- 切换 Project 后分类与切换前相同。
