# 015 — Tasks

- [x] T1 Spec / plan / README 索引 — 验证：`specs/015-model-usage/` + README 索引
- [x] T2 `UserMessageRow.model` + SCHEMA / ALTER / JSONL / merge / upsert — 验证：store 单测 + coalesce
- [x] T3 `ingestUserMessages` + `resolveAgentModel`；live turn_ended / resync 接线 — 验证：messages 单测 + reload
- [x] T4 `aggregateModelsByName` + `usage.by-provider` / insights Top model — 验证：usage / insights 单测
- [x] T5 全局 Most used models UI — 验证：typecheck；真机点 Rank 图标循环 skills→MCP→models
- [x] T6 单测 + typecheck；`paseo plugin reload activity` — 验证：`npm test` 112+；reload running
