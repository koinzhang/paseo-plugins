# 074 — 重扫不覆盖事件时间

## 背景

宿主 timeline 只在内存里（生产未接 `durableTimelineStore`），daemon 重启或归档对话被打开后，历史从 provider 重新回放。ACP（Cursor）、OpenCode、Pi 的回放事件不带时间戳，宿主用回放当刻补齐（上游 `agent-timeline-store.ts:41,140`，锚点 `49f9cec6be01` / `paseo 0.9.1`）。

插件 upsert 冲突时 `ts = COALESCE(excluded.ts, tool_calls.ts)`：后一次扫描总赢，于是重扫把已有的真实时间（或以首次入库时间代替的空 `ts`）改写成回放时间。本机实测 Cursor 有上百条调用挤在同一秒，1574 条 `ts` 晚于首次入库时间，其中 1284 条晚一小时以上。

## 目标

- 同一 tool call / user message 被多次采集时，事件时间只会变早、不会被更晚的回放时间覆盖。
- 事件时间不晚于该行首次入库时间 `ingested_at`：事件不可能在被观察到之后才发生。
- 升级后一次性修复已被覆盖的行：`ts` 晚于 `ingested_at` 的行清空 `ts`，按既有口径回落到 `ingested_at`。
- SQLite 与 JSONL 两种存储语义一致。

## 非目标

- 不补扫归档 agent / 已删除 project 下的 agent（见 049 G2 / §4.4，维持现状）。
- 不恢复首次就以回放时间入库的行的真实时间（无信息源；Cursor 回放与本地存储均无逐条时间）。
- 不改变 `COALESCE(ts, ingested_at)` 查询口径与任何 RPC 契约。

## 验收

- 已有 `ts` 的行被更晚的 `ts` 重扫：保留原值；被更早的 `ts` 重扫：取更早值。
- `ts` 为空的行被晚于 `ingested_at` 的 `ts` 重扫：保持为空；不晚于 `ingested_at`：写入。
- 启动后本地库不存在 `julianday(ts) > julianday(ingested_at)` 的行（`tool_calls` / `user_messages`）。
- `npm test`、`npm run typecheck` 通过，插件 reload 后 running。
