# 015 — Plan（HOW）

## 1. 数据模型

`user_messages` 增加可空列：

```sql
model TEXT  -- nullable; agent snapshot model at ingest
```

- 新库：`SCHEMA_SQL` 含 `model`
- 旧库：`PRAGMA table_info` 后 `ALTER TABLE … ADD COLUMN model TEXT`
- JSONL：行对象多 `model` 字段；缺省当 `null`
- Upsert：`model = COALESCE(user_messages.model, excluded.model)`（已有非空优先）
- `mergeMessage`：`model: previous.model ?? next.model`

## 2. 采集

### 2.1 `ingestUserMessages`

`opts.model?: string | null` → 写入每行。

### 2.2 Live（`index.server.ts`）

`agent.turn_ended`：

1. `resolveAgentModel(paseo, agentId)`（`ref` → `current()`，空则 `refresh()`）
2. `ingestUserMessages(..., { model })`

### 2.3 Resync / canonical

`ingestCanonicalPage` / `resyncAgents`：用 snapshot 的 `model` 传入；不 invent 未知。

### 2.4 `ingestTurnTimeline`

可选 `model` 传入；测试路径可显式传。

## 3. 聚合

`aggregateModelsByName(messages) → { model, count }[]`

`aggregateByProvider`：messages 入参扩 `model?`；每个 `ProviderUsageItem` 增加 `models`。

Zod：`ModelByNameItemSchema`；`ProviderUsageItemSchema.models`。

## 4. UI

- `rankKind`: `"skills" | "mcp" | "models"`，图标循环 Sparkles → Plug → Bot
- 计数文案：models 用 `N messages`（skills/mcp 仍 `N calls`）
- Insights：`Top provider` → **`Top model`**（`buildActivityInsights`；按 messages 加权）

## 5. 测试

- ingest 带 model；merge 不覆盖已有 model 为空
- aggregateModels / by-provider models
- insights Top model
- store sqlite ALTER + select 含 model
