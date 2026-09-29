# Plan

- 纯函数放在 `shared/last-exchange.ts`（client 不引用 `@getpaseo/protocol`）：
  - `pickLastExchange(entries)`：按 `seqStart`、时间戳、原顺序排好后，取最新非空 `user_message`；从尾部收集连续 `assistant_message` 并拼接，整段空白则继续往前找。
  - `assistantRunReachesStart(entries)`：最新一段回复一直延伸到已读窗口的第一条。
  - `readLastExchange(fetchPage)`：`tail` 起向前翻，最多 5 × 80；两边都找到且回复没有被窗口截断就停。
  - `excerpt(text)`：trim 后超过 2000 字截断。
- `client/last-exchange.ts`：`usePaseo().agents.ref(id).timeline.refetch`。先 projected，有任一正文就用；否则 canonical。失败只 `console.warn`。
- 详情在事实列表和操作按钮之间渲染 Prompt / Agent 两块。`state === "missing"` 时不请求。`refetchInterval` 10s。
- 不新增 RPC，不改表。
