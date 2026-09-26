# 003 Resend command

## 目标

增加 agent slash command `/resend`。无参数时原样重发当前会话最近一条非空用户 prompt；有参数时把参数接在该 prompt 后面，中间用一个换行分隔，再发送。

## 行为

- `/resend` 从当前 agent 的 projected timeline 尾部开始查找最新 `user_message`。
- 尾页没有用户消息时向前分页，直到找到或确认历史中不存在用户 prompt。
- 无参数时发送原始 prompt。有参数时发送 `prompt + "\n" + args`；`args` 保留内部换行，只去掉首尾空白。
- 找到后调用 Paseo SDK 的当前 agent `send(text)`；不复制图片或附件。
- 没有可重发的 prompt 时给出明确错误，不发起 provider turn。
- 与其他命令一样，可在 **Settings → Plugins → commands → Settings** 中单独关闭。

## 非目标

- 不重新生成上一条 assistant 回复。
- 不恢复原 prompt 的图片、附件或客户端 message ID。
- 不改变 agent 的 model、mode、effort 或 feature。

## 验收

- [ ] `/resend` 出现在 agent composer 的 slash autocomplete。
- [x] 无参数时原样发送最近一条非空用户 prompt。
- [x] timeline 尾页不含 prompt 时继续向前分页。
- [x] 有参数时用一个换行拼到最近一条 prompt 后面。
- [x] 空历史和仅空白 prompt 都有明确错误。
