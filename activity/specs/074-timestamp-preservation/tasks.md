# Tasks

- [x] 写清合并规则与存量修复口径（`spec.md` / `plan.md`）
- [x] SQLite upsert（`tool_calls` / `user_messages`）按合并规则保留更早时间（`mergedTsSql`）
- [x] JSONL `mergeRow` / `mergeMessage` 同规则；加载时清空晚于入库的 `ts`（`mergeTs` / `clampTs`）
- [x] SQLite 启动时幂等修复存量行（`CLAMP_TS_SQL`）
- [x] 单测覆盖三种合并情形与存量修复，SQLite / JSONL 各一遍（`server/store.test.ts` 074 两条）
- [x] 验证：`npm test` 250 通过、`npm run typecheck` 通过、`paseo plugin reload activity` 后 running；本地库 `julianday(ts) > julianday(ingested_at)` 行数 `tool_calls` 1574+ → 0、`user_messages` 0

## 残留（非目标）

- 首次即以回放时间入库、且未经 live 观察的行无法纠正：reload 后 Cursor 仍有 684 条落在 `2026-09-18T17:26:52`（首次安装时的全量补扫时刻）。无信息源可恢复，见 spec 非目标。
