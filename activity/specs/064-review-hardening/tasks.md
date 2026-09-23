# 064 — Tasks

- [x] T1 Spec / plan / tasks / README 索引 — 验证：064 目录及索引
- [x] T2 read-skill 校验真实路径文件名 — 验证：`handlers-query.test.ts` 符号链接到非 SKILL.md 被拒；软链 skill 目录可读
- [x] T3 unarchive 参数前加 `--` — 验证：代码审查（`execFile` 参数数组）
- [x] T4 `createRpcCache` + `UsageStore.generation()`，读 RPC 接入 — 验证：`rpc-cache.test.ts` 命中 / 写入失效 / TTL / LRU / 失败不缓存；真实库副本 by-provider 命中 0ms（未命中 ~70ms）
- [x] T5 `selectRecent` / `countRows` 下推 list、recent skill / MCP — 验证：`store.test.ts` 双 driver 排序 / offset / scope / count；原 recent handler 测试通过；真实库 list 1ms、recent 0.3ms
- [x] T6 SQLite 去掉重复 JS 过滤；新增 workspace / 表达式时间索引 — 验证：全部 store / handler 测试；真实库副本迁移后索引存在
- [x] T7 `agentActivitySpans` 替代后台全表读取 — 验证：`store.test.ts` 双 driver（MIN 行 provider / workspace）；`background-sync.test.ts` orphan agent 仍注册；真实库 7ms（原全表 ~60ms）
- [x] T8 Workspace 目录 hint 忽略无 update 回调 — 验证：typecheck；代码审查（周期 re-read 仅 `publish()` 无 update）
- [x] T9 增量历史扫描（checkpoint 存在 + 同 epoch） — 验证：`messages.test.ts` 增量停在 lastSeq 页、非增量 / epoch 变化全量
- [x] T10 `turn_ended` 跳过已终态 call — 验证：`store.test.ts` `terminalCallIds`；typecheck
- [x] T11 SQLite `timeout: 5000` + WAL — 验证：真实库副本 `journal_mode = wal`
- [x] T12 TTL 缓存清理过期项；`range.test.ts` / `rpc-cache.test.ts` 入 `npm test` — 验证：232 tests pass
- [x] T13 typecheck / reload — 验证：`npm run typecheck` 通过；`paseo plugin reload` 后 running、日志无报错
