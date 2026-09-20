# 046 — Host 关闭/归档：Active 列表即时更新

> 047 审查修订：以下为历史问题记录，不再作为当前实现要求。当前实现直接消费独立目录 observation；不再使用 useAgent/remove/Closed 推断归档，也不按时间戳锁住 Closed。明确 archivedAt（含 null）实时覆盖 UI 行。见 [047](../047-beta2-observation-remediation/spec.md)。

日期：2026-09-20。真机：`7f645140-…` 关闭后 Status=closed 且 Archived；plugin 日志与 usage.db 的 `archived_at` 瞬时已写入，但 Explorer Active 仍慢。

## 根因

Active/Archived 过滤看的是 `usage.agents` 查询里的 `archivedAt`（本地 registry）。Server `agent.archived` hook 写入很快；client 只靠 15s 轮询或 debounced directory invalidate，缓存滞后。

## 目标

| ID | 行为 |
|---|---|
| G1 | 目录 `remove` / upsert(`archivedAt` 或 `status:closed`) → 乐观写入 agents 查询 `archivedAt` 并 invalidate |
| G2 | `useAgent` 变为 null 或 `status:closed` → 同样乐观写入（onClosed） |
| G3 | 已有 `archivedAt` 不覆盖 |

## 验收

- [ ] 宿主关闭 agent 后，Active 列表近实时消失（或仅 Archived 可见）
- [x] typecheck / 单测 / reload
