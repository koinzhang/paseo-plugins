# 029 — plan

## 方案

纯客户端：`WorkspaceActivityPanel` 增加 `agentSearchOpen` / `agentSearchQuery` state。

- 标题行右侧：`headerActions` 行内 `Search` 图标 → `Settings2`
- 展开：同行走 `TextInput`（`@getpaseo/plugin/client/react-native`）+ 关闭（`X`），设置按钮仍在右侧
- `visibleAgentItems` 在 status/lifecycle 过滤之后、排序之前再套标题匹配

## 文件

| 文件 | 改动 |
|---|---|
| `client/workspace-panel.tsx` | UI + 过滤 |
| `specs/README.md` | 登记 029 |
