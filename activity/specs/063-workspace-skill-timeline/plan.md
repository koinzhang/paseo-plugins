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
- Skills 标题 actions 从单按钮改为横排：Skills / MCP 切换在前，视图切换在后（图标 `GitCommitVertical` / `LayoutList`，指向切换后的目标视图）。
- timeline 行：Sparkles 图标、skill 名、agent title / ID 副标题、右侧 `FormattedTime`。
- 原 Skills / MCP 排行保持不变。
- `explorer-agent-display` settings 升级到 v3，以 `rankView` 取代 `skillView`；默认 `timeline`。v1 无视图字段时补 `timeline`，v2 从 `skillView` 保留选择。客户端直接从 `useSettings` 读取并用现有完整 document + revision 写回。
- Workspace panel 从已执行 `reconcileHostArchive` 的完整 agent 列表派生 archived agent ID 集合并传入 `RankSection`；Skills / MCP 时间线共用该集合决定节点颜色，不新增 RPC 字段。
- `RankSection` 的时间线行使用 `Pressable`；仅未归档且宿主提供 `openAgent` 时启用，整行点击调用 `openAgent({ agentId })`。

## 3. 验证

- handler 单测覆盖排序、workspace 过滤、low 排除、标题回退、limit。
- `npm test`
- `npm run typecheck`
- `paseo plugin reload activity`
