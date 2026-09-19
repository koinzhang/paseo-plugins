# 001 — RPC 契约（draft）

> 实现时以 `shared/` 中的 zod 定义为唯一真相源，本文件保持同步。
> 所有 RPC 由 server 端 `server.handle` 注册，client 端 `useRpc` 调用。

## usage.summary

工具使用总览。Composer pill 与详情总览共用；pill 调用时传入当前 `agentId`。

```ts
input: {
  from?: string;        // ISO 时间，默认全部
  to?: string;
  agentId?: string;     // pill 必传当前 agent；panel 可按过滤条件传
  workspaceId?: string;
}
output: {
  shellCalls: number;
  shellFailures: number;
  skillCalls: { exact: number; inferred: number; low: number };
  mcpCalls: number;
  mcpFailures: number;
  toolCallsByKind: Record<string, number>;
  // pill 的 icon 查询（useUsagePillData）会调用；label 由 skills-by-name + mcp-by-tool 派生（不含 shell）：
  // 最近调用的实体美化名；实体数 > 1 时为 `Name + N`（N = 实体总数 − 1），不带 ×count
}
```

## usage.list

明细列表（分页）。

```ts
input: {
  category?: "skill" | "mcp" | "regular";
  confidence?: "exact" | "inferred" | "low";
  skillName?: string;
  mcpServer?: string;
  agentId?: string;
  from?: string;
  to?: string;
  limit?: number;       // 默认 200
  offset?: number;
}
output: {
  total: number;
  rows: Array<{
    agentId: string;
    callId: string;
    provider: string;
    name: string;
    category: string;
    confidence: string | null;
    skillName: string | null;
    mcpServer: string | null;
    mcpTool: string | null;
    command: string | null;
    status: string | null;
    ts: string | null;
    ingestedAt: string;
  }>;
}
```

## usage.skills-by-name

按 skill 名聚合调用次数（exact / inferred / low 分列，不混为一列）。

```ts
input: {
  from?: string;
  to?: string;
  agentId?: string;
  workspaceId?: string;
}
output: {
  items: Array<{
    skillName: string;
    exact: number;
    inferred: number;
    low: number;
    total: number;
    lastUsedAt: string | null;  // COALESCE(ts, ingested_at)
    skillPath: string | null;   // SKILL.md：采集 file_path 优先；缺失时按根解析（本 agent 含项目根，全局仅 home）；返回时 homeDir → `~`
  }>;
}
```

## usage.read-skill

读取本地 SKILL.md 内容，供 **agent usage panel 内阅读器** 展示（全局 surface 不调用）。路径仅来自库内 `skillPath`（可含 `~`）；服务端校验非空、无 NUL，`expandHomePath` 后 `readFile`；响应 `path` 再折叠为 `~`。

```ts
input: { path: string }
output: { path: string; skillName: string | null; body: string }
```

## usage.resync（008 已移除；历史记录）

回填 / 增量同步。

```ts
input: { agentIds?: string[] }   // 缺省为全部 agent
output: { syncedAgents: number; inserted: number; errors: Array<{ agentId: string; message: string }> }
```

## usage.by-provider

全部 usage 按 **规范化 provider** 分组汇总（侧边栏全局 Tool Usage 用）。不传 `agentId` 即全部 agent。

```ts
input: {
  from?: string;
  to?: string;
  workspaceId?: string;  // 可选：仅某 workspace
}
output: {
  totals: {
    shellCalls: number;
    skillCalls: { exact: number; inferred: number; low: number };
    mcpCalls: number;
  };
  providers: Array<{
    provider: string;           // normalized：claude / opencode / codex / …
    label: string;              // 展示名，如 "Claude"
    shellCalls: number;
    shellFailures: number;
    skillCalls: { exact: number; inferred: number; low: number };
    skills: Array<{             // 按 skill 名聚合，不只展示 skill 总数
      skillName: string;
      exact: number;
      inferred: number;
      low: number;
      total: number;
      lastUsedAt: string | null;
      skillPath: string | null;   // 同 skills-by-name：采集优先；全局仅 home 根解析；返回时 `~`
    }>;
    mcpCalls: number;
    mcpFailures: number;
    mcpTools: Array<{           // 按 server.tool 聚合，不只展示 mcp 总数
      server: string;
      tool: string;
      count: number;
      failures: number;
      lastUsedAt: string | null;
    }>;
    agentCount: number;         // 该 provider 下出现过的 distinct agent_id
    callCount: number;          // 该组 tool_calls 行数
  }>;
}
```

分组键：`normalizeProvider(tool_calls.provider)`（与 `shared/classify.ts` 同源）。每组 `skills` / `mcpTools` 与按名聚合 RPC 同源。UI 只展示 MCP / Skills；`shellCalls` / `shellFailures` 仍返回（导出与统计用，见 spec NG10）。

## usage.mcp-by-tool

按 MCP `server` + `tool` 聚合调用次数。

```ts
input: {
  from?: string;
  to?: string;
  agentId?: string;
  workspaceId?: string;
}
output: {
  items: Array<{
    server: string;
    tool: string;
    count: number;
    failures: number;
    lastUsedAt: string | null;
  }>;
}
```

## usage.export

导出 markdown 报告。

```ts
input: { from?: string; to?: string; agentId?: string }
output: { markdown: string }
```
