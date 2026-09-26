# Research

版本锚点沿用 001：Paseo `49f9cec6b`，`paseo --version` 0.9.2，`@getpaseo/plugin` / `@getpaseo/client` 0.9.2。

## 已验证契约

- `packages/client/src/index.ts`：slash command 上下文的 `paseo.agents.ref(id)` 返回 `PaseoAgentHandle`，提供 `timeline.refetch(options)` 与 `send(text)`。
- `packages/protocol/src/messages.ts`：timeline 支持 `tail` / `before` 分页，响应包含 `entries`、`startCursor` 与 `hasOlder`。
- `packages/protocol/src/agent-types.ts`：用户 prompt 的 timeline item 为 `{ type: "user_message", text: string }`。
- 当前插件文档的 client slash command callback 提供 `paseo`，Paseo 负责 pending、清空 composer 与错误 toast。

## 结论

重发可以完全在 client contribution 中通过公开 Paseo SDK 完成，无需复用 Commands 的私有 daemon 连接。
