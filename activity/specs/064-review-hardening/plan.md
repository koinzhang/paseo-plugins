# 064 — Plan

## read-skill（`server/handlers.ts`）

`assertAllowedSkillPath`：`absolute` 与 `real` 都必须以 `/SKILL.md` 结尾；根目录判定不变（`underHome` 为 `absolute || real`，`underDefault` 为两者都匹配）。

## unarchive

`execFile("paseo", ["agent", "reload", "--", agentId])`。

## 读路径

- `server/rpc-cache.ts`：`createRpcCache({ ttlMs: 30_000, maxEntries: 64 })`，key = `rpcName + JSON(input)`，命中条件 `generation === store.generation() && age < ttl`；Map 插入序做 LRU 淘汰
- `UsageStore.generation()`：每次 upsert / delete / setSyncState 自增
- `index.server.ts`：读 RPC 统一经 `cached(rpc, handler)`；unarchive / export / read-skill / host-info 不缓存
- `UsageStore.selectRecent(filter, { limit, offset, where })`：`ORDER BY COALESCE(ts, ingested_at) DESC, call_id DESC LIMIT ? OFFSET ?`；`where` 为受控枚举 `"skill-named"`（`confidence IS NOT 'low' AND TRIM(COALESCE(skill_name,'')) <> ''`）/ `"mcp-named"`
- `UsageStore.countRows(filter)`：`SELECT COUNT(*)`
- `UsageStore.agentActivitySpans()`：`GROUP BY agent_id` 取 MIN 有效时间，provider / workspace_id 为 bare column（仅在 MIN 是唯一聚合时取自 MIN 行，故 MAX 用相关子查询），替代 `agentsFromToolCalls(store.select())`
- SQLite `select` 去掉 `rowMatchesFilter`；`selectUserMessages` / `selectAgents` 仅在 `provider` 过滤时做 JS 过滤（归一化比较无法下推）
- 索引：`tool_calls(workspace_id, category)`、`tool_calls(COALESCE(ts, ingested_at))`、`user_messages(COALESCE(ts, ingested_at))`

## 客户端

`use-agent-turn-end.ts`：目录回调 `update === undefined` 直接 return。

## 采集

- `resyncAgents(..., options?: { incremental?: boolean })`：incremental 且 `previous.epoch === newest.epoch` 时，每页 ingest 后若 `page.startCursor.seq <= previous.lastSeq` 即停止（该页整页 ingest，作为重叠区覆盖 tool_lifecycle 合并项）
- `background-sync.ts`：`incremental = checkpoints[agent.id] !== undefined`（当前版本下曾成功扫描）
- `UsageStore.terminalCallIds(agentId)`：返回已终态的 call_id；`turn_ended` 过滤掉这些行

## SQLite

`new DatabaseSync(path, { timeout: 5000 })`；`PRAGMA journal_mode=WAL`。

## 杂项

`createKeyedTtlCache.get` 在写入前清理过期项；`package.json` test 列表加入 `client/range.test.ts`。
