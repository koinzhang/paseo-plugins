# 075 — Prompt 回放副本去重

## 背景

同一条 prompt 在库里可能存两份：

- 实时：App 提交的 prompt 在宿主 timeline 里 `messageId` 是客户端 ID（`msg_<13位毫秒>_<随机>` / `draft_msg_…`，`app/src/types/stream.ts:30`），provider 回显的 ID 只挂在宿主内部行 `providerMessageId` 上（`agent-manager.ts:4654-4700`），插件拿到的 fetch entry / `turn_ended` item 都不带。
- 回放：daemon 重启或重新加载后，宿主从 provider 历史重建 timeline，同一 prompt 以 provider ID（Codex / Claude / omp / OpenCode）或无 ID（ACP，入库为 `canonical:` 哈希）出现。

两份 ID 不同，`(agent_id, message_id)` 主键挡不住。本机实测：OpenCode 某 agent 库里 33 条、provider 原生 20 条，其中 12 对是同一 prompt 的客户端 ID + OpenCode ID，时间相差约 10 ms；Cursor 21 个 agent 同时有客户端行（171）与回放 `canonical:` 行（147）。

锚点：上游 `49f9cec6be01` / `paseo 0.9.1`。

## 目标

- 同一 agent 内识别并删除回放副本，保留实时行（真实时间、发送时 model）。
- 规则只依据库内已有字段（ID 形态、时间、seq），不读 provider 会话目录。
- 每次扫描后与启动时都执行，结果幂等；SQLite / JSONL 一致。

## 规则

实时行：`message_id` 匹配 `^(draft_)?msg_\d{13}_`。

- **A · 带时间的回放**：非实时、非 `canonical:`、`ts` 非空的行，若与同 agent 任一 `ts` 非空的实时行相差 ≤ 2 秒，删除。
- **B · 匿名回放**：取同 agent `canonical:` 行中最早有效时间 `t0`，其后 60 秒内的为一批回放。设 `k` 为有效时间早于 `t0` 的实时行数，删除该批中 seq 最大的 `min(k, 批大小)` 条。

## 非目标

- 不做补采（见 074 与此前可行性分析）。
- 不处理非副本的差异：实时发送但 provider 未持久化的 prompt（中断 / 排队）、无时间的实时行（仅 `turn_ended` 入库、未经扫描）与回放行之间的对应。
- 不改 RPC 契约与 Prompts 计数口径。

## 验收

- 本机数据按规则模拟：删除 187 条（Cursor 144 / OpenCode 27 / omp 9 / Codex 4 / Claude 3 / Pi 0）；以 provider 原生会话为基准，原本一致的 agent 无一变为不一致，且无 agent 被删到低于原生计数。
- reload 后本地库与模拟一致；再次扫描不回增。
- `npm test`、`npm run typecheck` 通过。
