# 042 — plan

## 方案

- `AgentShowField` / settings zod / `SHOW_FIELD_OPTIONS` 增加 `prompt`
- `formatAgentMeta` 接受可选 `promptPreview`；仅当 `show` 含 `prompt` 且预览非空（或加载占位）时拼接
- `agents-section`：行组件在 `prompt` 开启时调用 `useLatestUserMessagePreview(agentId, enabled)`
- hook 增加 `enabled`，避免未勾选时打 timeline

## 文件

| 文件 | 改动 |
|---|---|
| `shared/explorer-agent-display.ts` | show enum + `prompt` |
| `client/workspace/constants.ts` | 类型 + 菜单项 |
| `client/workspace/filters.ts` | meta 拼接 |
| `client/use-latest-user-message.ts` | `enabled` |
| `client/workspace/agents-section.tsx` | 行内取 preview |
| 单测 / CHANGELOG / specs README | 登记 |
