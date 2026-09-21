# 063 — Plan（HOW）

## 1. RPC

新增 `usage.recent-skill-calls`：

```ts
input: { workspaceId: string; limit?: number }
output: {
  items: Array<{
    agentId: string;
    agentTitle: string | null;
    callId: string;
    skillName: string;
    calledAt: string;
  }>;
}
```

handler 从 `tool_calls` 选择当前 workspace 的 skill 行，排除 `confidence = low` 与空 `skillName`，按有效时间倒序；与本地 agent registry 以 `agentId` 关联标题，最后截取 `limit`。

新增同形的 `usage.recent-mcp-calls`，item 使用 `server` / `tool`；按当前 workspace 选择 MCP 行并按有效时间倒序。

## 2. Client

- Workspace panel 增加 recent skill calls query，与现有 15s 刷新及 turn-end invalidation 同步。
- `RankSection` 使用共用 `rankView: "ranked" | "timeline"` 和切换回调，Skills / MCP 都按该值渲染。
- Skills 标题 actions 从单按钮改为横排：Skills / MCP 切换在前，视图切换在后。
- timeline 行：Sparkles 图标、skill 名、agent title / ID 副标题、右侧 `FormattedTime`。
- 原 Skills / MCP 排行保持不变。
- `explorer-agent-display` settings 升级到 v3，以 `rankView` 取代 `skillView`；v1 补 `ranked`，v2 从 `skillView` 保留选择。客户端直接从 `useSettings` 读取并用现有完整 document + revision 写回。

## 3. 验证

- handler 单测覆盖排序、workspace 过滤、low 排除、标题回退、limit。
- `npm test`
- `npm run typecheck`
- `paseo plugin reload activity`
