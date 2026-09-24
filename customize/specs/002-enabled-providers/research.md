# 002 — Research

- Paseo 源码锚点：`49f9cec6be01ef7e7604dadf127425eac6493820`；本机 `paseo --version`: `0.9.1`。
- `packages/client/src/index.ts` 的 `PaseoProviderActions.snapshot()` 返回 Provider 快照。
- `packages/protocol/src/agent-types.ts` 的 `ProviderSnapshotEntry` 含 `enabled`、`source?: "builtin" | "custom"`、`status`、`label`；`packages/protocol/src/messages.ts` 对旧消息缺失的 `enabled` 默认 `true`。
- `packages/server/src/server/agent/provider-snapshot-manager.ts` 依据定义填写 `enabled` 与 `source`。`source=custom` 不普遍等于 ACP；本看板现有自定义 scanner 仅 Cursor。
