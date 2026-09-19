# 024 — Plan（HOW）

## 1. RPC（shared/usage.ts）

`AgentUsageItemSchema`：agentId / provider / title / callCount / skillCalls / mcpCalls / shellCalls / fileReads / fileWrites / messageCount / coding / createdAt / lastActivityAt。

`usageAgentsRpc`（`usage.agents`）input `{ workspaceId?, from?, to? }`，output `{ items }`。

`aggregateAgents(rows, agents, messages)`：

- rows → 每 agent：callCount++；category skill 时 exact/inferred 计 skillCalls（low 忽略）；mcp → mcpCalls；isShellCall / isFileRead / isFileWrite；isCodingOp → coding；lastActivityAt = max(ts ?? ingestedAt)
- agents（registry）→ title / createdAt / provider 兜底；provider 统一 `normalizeProvider`
- messages → messageCount++；lastActivityAt 取 max
- 排序见 spec §4

## 2. Server（handlers.ts / index.server.ts）

`createAgentsHandler(store)`：

- `store.select({ workspaceId, from, to })`
- `store.selectUserMessages({ workspaceId, from, to })`
- `store.selectAgents({ workspaceId })`（registry 不裁窗口）
- `aggregateAgents(...)`

`index.server.ts` 注册 `usageAgentsRpc`，沿用 `background.request(context.paseo)`。

## 3. Client

- `client/range.ts`：从 global-surface 抽出 `RangeId` / `rangeFrom` / `RANGE_OPTIONS`（行为不变）
- `client/workspace-panel.tsx`：`WorkspaceActivityPanel({ workspaceId, navigation, theme, layout })`
  - `useWorkspace(workspaceId, ws => ws.title ?? ws.name)`
  - 4 个 `useQuery`（15s / retry false）：summary、agents、skills-by-name、mcp-by-tool（全部带 workspaceId + from）
  - KPI（UsageStats）：skill / MCP / shell / file reads / file writes / messages / agents
  - Agents 排行：`navigation?.openAgent({ agentId })`；图标 Bot
  - Top skills（Sparkles）/ Top MCP（Plug），上限 `ACTIVITY_LIST_LIMIT`（8）
- `index.client.tsx` 注册 workspace panel：`id: "workspace-activity"`，`locations: ["explorer"]`

## 4. 测试

- `shared/usage.test.ts`：`aggregateAgents` 分组 / low 不计 / coding / messages / 排序 / 空 agent
- `server/handlers-query.test.ts`：`usage.agents` handler workspaceId 过滤 + registry 合并

## 5. 验证

`npm test`、`npm run typecheck`、`paseo plugin reload activity`；真机在 Explorer 打开 Activity 面板核对 KPI / 排行。
