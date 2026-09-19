# 012 — 审查修复（2026-09-19）

- 状态：已实现
- 日期：2026-09-19
- 来源：[`docs/reviews/2026-09-19-code-review.md`](../../docs/reviews/2026-09-19-code-review.md)

## 1. 目标

消化该审查中的 Bug / 性能 / 次要项与死代码；Spec 漂移回改对应旧目录（不在本目录重复）。

## 2. 非目标

- 不改插件 ID（仍属 007 Phase 2）
- 不压缩 JSONL 历史（审查次要 #5，默认 sqlite，延后）

## 3. 验收（对照审查编号）

| ID | 行为 |
|---|---|
| B1 | Command Center「Export activity report」将 markdown 写入剪贴板；失败可感知 |
| B2 | `usage.read-skill` 仅允许已知 skill roots 下、路径以 `SKILL.md` 结尾的文件，并有大小上限 |
| B3 | `UsagePopover` 无条件调用 hooks（context guard 在外层） |
| B4 | 重分类变更 category 时清空/覆盖 category 依赖字段，无脏残留 |
| B5 | timeline epoch 替换后，无 id 消息的 `canonical:` 主键不重复计数 |
| P1 | SQLite `select` / `selectUserMessages` / `selectAgents` 将 `agentId` 与 `from`/`to` 下推 WHERE |
| P2 | background sync 复用 `agents.list`；skill roots / MCP 解析有 TTL 缓存 |
| P3 | skill 路径解析对 root 目录列表做 TTL 缓存 |
| P4 | pill 轮询不再请求无用的 `usage.summary` |
| P5 | panel / read-skill 查询 `retry: false` |
| 次要 | range 跨午夜、heatmap mix/复数、pill 缓存清理、checkpoint 修剪、pending-skill 多槽、message upsert prepare 缓存、命名 Activity、死代码清理 |

## 4. Spec 漂移（回改旧文件）

- `001` US-5 / US-7 / US-8
- `007` §5 验收勾选与 rescan 项
