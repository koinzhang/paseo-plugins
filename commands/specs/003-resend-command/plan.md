# Plan

## 数据流

1. client slash callback 校验 `args` 为空。
2. 通过 `ctx.paseo.agents.ref(ctx.agent.id).timeline.refetch()` 读取 projected timeline：
   - 首次 `direction: "tail"`；
   - 每页最多 100 条；
   - 未找到且 `hasOlder` 时，以 `startCursor` 继续 `direction: "before"`。
3. 每页选择 `seqStart` 最大的非空 `user_message.text`。
4. 无参数时发送原始文本。有参数时发送 `prompt\nargs`，再调用同一个 agent handle 的 `send(text)`。

## 结构

- `shared/resend.ts`：纯函数，负责从 timeline entries 中选出最新 prompt，便于单测。
- `client/commands.ts`：把 command spec 扩展为 control command / direct command 两类；`/resend` 使用 direct callback。
- 不新增 RPC、server handler 或持久化数据。

## 边界

- 页面报告 `hasOlder` 但没有 `startCursor` 时视为历史结束，避免循环。
- 仅空白的用户消息被忽略，但发送时保留所选 prompt 的原始文本。
- 使用 projected timeline，与用户在 Paseo 对话中看到的文本一致。
