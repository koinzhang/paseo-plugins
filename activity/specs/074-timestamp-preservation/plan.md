# 方案

## 合并规则

对同一主键的已有行 `prev` 与新采集 `next`（`ingested_at` 永远取 `prev`，既有语义）：

| `next.ts` | `prev.ts` | 结果 |
|---|---|---|
| 空 | 任意 | `prev.ts` |
| 非空 | 空 | `next.ts` 不晚于 `prev.ingested_at` 时取 `next.ts`，否则保持空 |
| 非空 | 非空 | 两者取更早 |

时间比较用 `julianday()`（SQLite）/ `Date.parse`（JSONL），不按字符串比较，避免时区后缀差异。无法解析的新值不采用。

依据：回放补的时间恒不早于真实时间，真实时间恒不晚于首次观察（`ingested_at`），所以「取更早且不晚于首次入库」只会逼近真实值。

## 存量修复

`SqliteUsageStore` 构造时执行一次幂等修复（每次启动都跑，数万行量级为毫秒级）：

```sql
UPDATE tool_calls    SET ts = NULL WHERE ts IS NOT NULL AND julianday(ts) > julianday(ingested_at);
UPDATE user_messages SET ts = NULL WHERE ts IS NOT NULL AND julianday(ts) > julianday(ingested_at);
```

JSONL 在加载时对内存行做同样的清空。

Codex 少量行（完成时间晚于运行中首次入库，偏差分钟级）也会被清空并回落到 `ingested_at`，误差不超过该调用本身的时长，可接受。

## 不涉及

- 不 bump `BACKFILL_VERSION`：分类语义未变，无需全量重扫。
- `agents.created_at`（005 G3 用最早工具调用近似）自动受益，无需改动。
