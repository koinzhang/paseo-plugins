# Plan

- `agents.states` 输出新增 `live: Record<agentId, { status, attention }>`（只含 host 上存在的 agent），`states` 保持不变。
  - `status`：`AgentSnapshotPayload.status`（`initializing` / `idle` / `running` / `error` / `closed`）。
  - `attention`：`pendingPermissions.length > 0` → `permission`；否则 `requiresAttention` 时取 `attentionReason`（`finished` / `error`）；否则 null。
  - 数据来自 `paseo.agents.ref(id).refresh()`，与现有 `lookupAgent` 同一次请求。
- `shared/agent-status.ts`：`describeAgentStatus(state, live)` → `{ label, tone } | null`，按 spec 优先级；客户端列表行与详情共用。
- 客户端：`AgentBadge` 改用上述函数并带色点；Open 按钮仅在非 archived / missing 时显示；轮询 10s。
