# 006 — RPC / 契约

> 以 `shared/usage.ts` zod 为真相源；本文件同步。

## ActivityDay（扩展）

```ts
{
  date: string;       // YYYY-MM-DD local
  skills: number;
  mcp: number;
  agents: number;     // 005: 当日创建数
  messages: number;   // 006: 当日 user_message 数
  total: number;      // skills + mcp（着色用；不含 agents/messages）
}
```

## usage.activity-by-day

输出 `days: ActivityDay[]`（含 `messages`）。input 不变（`from` / `to` / `provider` / `workspaceId`）。

## usage.by-provider（扩展）

`ProviderUsageItem` 增加：

```ts
messageCount: number;  // 窗内该 provider 的 user_messages 行数
```

全局 KPI Messages = 筛选后各 provider `messageCount` 之和，或直接 `selectUserMessages(filter).length`（须一致）。

## 非本版 RPC

- 不新增独立 `usage.messages-by-day`（先并入 activity-by-day）
- 不新增消息列表明细 RPC（无正文、无 UI 列表需求）
