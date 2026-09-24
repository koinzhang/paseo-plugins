# Tasks

- [x] 写清副本来源、规则与本机模拟基线（`spec.md` / `plan.md`）
- [x] `replayDuplicateMessageIds` 纯函数 + 单测（`server/prompt-dedupe.ts`；`server/messages.test.ts` 075 两条）
- [x] `pruneReplayDuplicateMessages`（SQLite / JSONL，JSONL 用 `__delete_messages` 墓碑），打开存储时全库执行（`messages.test.ts` 075 reopen 用例，两种 driver）
- [x] 接入 `resyncAgents`（每个 agent 扫描完成后）与 `agent.turn_ended`（写入 user messages 后）
- [x] 验证：`npm test` 254 通过、`npm run typecheck` 通过、`paseo plugin reload activity` 后 running；本地库 user_messages 1648 → 1461（删除 187，与模拟逐 provider 一致：Cursor 144 / OpenCode 27 / omp 9 / Codex 4 / Claude 3）；修复后按同规则重算删除数为 0
