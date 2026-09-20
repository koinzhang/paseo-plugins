# 045 — Closed：抵抗 0.9 agentDetails 陈旧 idle 覆盖

> 047 审查修订：以下为历史问题记录，不再作为当前实现要求。当前实现直接消费独立目录 observation；不再使用 useAgent/remove/Closed 推断归档，也不按时间戳锁住 Closed。明确 archivedAt（含 null）实时覆盖 UI 行。见 [047](../047-beta2-observation-remediation/spec.md)。

日期：2026-09-20。依赖 043 / 044。真机：关闭 `7f645140-bd38-435e-a3f1-0928d6802650` 仍慢。

## 背景

Paseo 0.9 插件 `getAgent` 为 `agents.get(id) ?? agentDetails.get(id)`。目录 `remove` 后 agent 仍可从 `agentDetails` 读出，且常为旧的 `idle`。043 的 `useAgent == null → closed` 不再可靠；`remove→closed` 会被随后的 `useAgent` idle 快照写回。

## 目标

| ID | 行为 |
|---|---|
| G1 | `shouldRetainClosedStatus`：已 closed 时，忽略同时间戳或更旧的非 closed 快照；显式 `status:"closed"` 或更新的 `updatedAt` 才允许变更 |
| G2 | `applyAgentStatusUpdate` / `AgentLiveStatusSync` / `mergeClosedStatusMarkers` 均应用 G1 |
| G3 | 不调用全量 `agent.refresh()`（避免 ensureAgentLoaded 唤醒已关闭 runtime） |

## 验收

- [ ] 关闭 agent 后 Explorer Lifecycle=Closed 近实时且不被 idle 打回
- [x] 单测覆盖 retain / merge / apply
