# 063 RPC contract

## `usage.recent-skill-calls`

```ts
input: {
  workspaceId: string;
  limit?: number; // 1..100；默认 8
}

output: {
  items: Array<{
    agentId: string;
    agentTitle: string | null;
    callId: string;
    skillName: string;
    calledAt: string; // ts ?? ingestedAt
  }>;
}
```

`items` 按 `calledAt` 倒序，只包含 exact / inferred skill 调用；agent registry 无标题时 `agentTitle` 为 `null`，由客户端回退到 `agentId`。

## `usage.recent-mcp-calls`

```ts
input: {
  workspaceId: string;
  limit?: number; // 1..100；默认 8
}

output: {
  items: Array<{
    agentId: string;
    agentTitle: string | null;
    callId: string;
    server: string;
    tool: string;
    calledAt: string; // ts ?? ingestedAt
  }>;
}
```

`items` 按 `calledAt` 倒序，每一行代表一次 MCP 调用。
