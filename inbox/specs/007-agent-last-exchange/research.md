# Research

锚点：Paseo `30178c4f5`（2026-09-30），`paseo --version` 0.10.2。

- `packages/protocol/src/agent-types.ts`：`user_message` 与 `assistant_message` 都有 `text: string`。
- `packages/protocol/src/agent-attention-notification.ts` 的 `findLatestAssistantMessageFromTimeline`：从尾部把连续的 `assistant_message` 拼起来，因为 provider 会分段流式输出。Inbox 用同一规则。
- `packages/client/src/index.ts`：`agents.ref(id).timeline.refetch({ projection, direction, cursor, limit })` 返回 `entries`、`hasOlder`、`startCursor`。Activity 的最新 prompt 预览与 Commands 的 `/resend` 都走这条公开 API。
- sidebar surface 不能用 `useAgent`（001 research），但 `usePaseo()` 指向当前选中的 host，timeline 读取放在 client。
