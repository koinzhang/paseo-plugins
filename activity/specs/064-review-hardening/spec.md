# 064 — 代码审查修复：安全 / 性能 / 健壮性

## 背景

2026-09-24 审查 `activity/`（本机库 `tool_calls` 2.26 万行、18 MB）发现：

- `usage.read-skill` 只校验请求路径，符号链接可把任意文件（≤512KB）读回客户端
- `usage.agent.unarchive` 把 `agentId` 直接作为 CLI 位置参数，`-` 开头会被当作选项
- 每个读 RPC 全量 `SELECT` 后在 JS 里二次过滤、排序；`usage.by-provider({})` 单次同步阻塞约 80ms，Global / Workspace 面板每 15s 各有 6 个查询
- Workspace 面板目录观察每 15s 全量 re-read 后以「无 update」回调触发 `schedule()`，额外两轮失效重刷
- 后台同步每次对变更 agent 全量回扫 timeline；`agent.turn_ended` 每轮 upsert 整段历史
- SQLite 未设 busy timeout / WAL；多个实例共库（如 `--id` 并存的 npm 版 + 本地版）时并发写立即 `database is locked`
- `createKeyedTtlCache` 从不清理过期项；`client/range.test.ts` 未进 `npm test`

## 目标

1. read-skill：真实路径 `real` 的文件名也必须是 `SKILL.md`；根目录判定保持原规则（skill 目录常软链到根外，如 `~/.agents/skills/ego-browser -> ~/.local/share/ego/ego-skills`，不能要求 `real` 在根内）
2. unarchive：`agentId` 前加 `--` 结束选项解析
3. 读 RPC：服务端结果缓存（store 写代数 + 30s TTL + 条目上限）；列表 / 最近调用下推 `ORDER BY … LIMIT`，总数用 `COUNT(*)`；SQL 已覆盖的过滤不再在 JS 重复；补 workspace 与 `COALESCE(ts, ingested_at)` 表达式索引；后台目录同步用 SQL `GROUP BY` 代替全表读取
4. Workspace 目录 hint 只响应真实 `update`，周期 re-read 不触发刷新
5. 后台同步：该 agent 在当前 `BACKFILL_VERSION` 下已有 checkpoint 且 epoch 未变时增量扫描（跨过上次 `lastSeq` 的那一页后停止）；无 checkpoint / 版本变化 / epoch 变化仍全量
6. `turn_ended`：库中已是终态（completed / failed / canceled）的 call 不再重复 upsert
7. SQLite：`timeout: 5000` + `journal_mode=WAL`
8. TTL 缓存写入时清理过期项；`range.test.ts` 加入测试脚本

## 非目标

- 不把全部聚合改写为 SQL（`shared/usage.ts` 聚合函数保持以行数组为输入）
- 不改 RPC 契约（名称、输入输出 schema 不变）
- JSONL 降级存储不做压缩

## 行为变化 / 偏差

- 读 RPC 结果最多滞后 30s：本进程写入立即失效；时间相关项（by-hour 当前小时、最长寿命的活跃时长）与另一进程（`--id` 并存实例共库）的写入只受 TTL 约束
- 数据库切到 WAL（持久化在 `usage.db`，会多出 `-wal` / `-shm` 文件）
- 增量扫描后，用户改 OpenCode MCP 配置不再自动重分类旧行；需 bump `BACKFILL_VERSION` 触发全量（修订 `handlers.ts` 原「Always full-scan」约定）

## 验收

- 符号链接 `…/skills/x/SKILL.md -> 非 SKILL.md 文件` 被拒；正常 skill 可读
- `agentId = "--help"` 以位置参数传给 CLI
- 同一输入重复调用命中缓存；任一 upsert 后失效
- list / recent 结果与改动前一致（单测覆盖排序、limit、offset、total）
- 目录周期 re-read 不再调用 refresh；真实 update 仍触发
- 增量扫描在跨过 `lastSeq` 的页后停止；epoch 变化或无 checkpoint 时全量
- `npm test` / `npm run typecheck` 通过；`paseo plugin reload` 后 running
