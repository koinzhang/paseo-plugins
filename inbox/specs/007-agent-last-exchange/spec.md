# 007 收藏 agent 详情展示最后一轮对话

## 目标

收藏的 agent 详情里展示 host timeline 上**最后一条用户 prompt** 和**最后一条 agent 回复**，方便不打开会话就回忆上次在聊什么。

## 已定决策

1. 只出现在详情，不出现在列表行。全局 Inbox 与 Explorer 的 workspace Inbox 共用同一详情。
2. 用户 prompt 取 timeline 里最新的非空 `user_message`。Agent 回复取最新一段连续的 `assistant_message`（provider 会把一条回复拆成多段流式 chunk，中间被 tool call 打断的更早回复不算）。
3. 两条各自取最新，不要求属于同一轮：用户刚发出、agent 还没回时，prompt 是新的，回复仍是上一条。
4. 优先读 projected timeline（界面上看到的文本），没有正文时再读 canonical。从尾部向前翻，最多 5 页、每页 80 条；最后一段回复如果顶到已读窗口的开头，再多读一页以免把开头截掉。
5. 正文不写入 Inbox 的 SQLite。详情打开时读取，并与状态轮询一样每 10s 刷新。
6. host 上已不存在的 agent 不读 timeline。已归档的 agent 仍尝试读取。
7. 展示时保留换行，单条超过 2000 字时截断并加省略号。没有 prompt 或没有回复时，对应一块显示 `None yet`。

## 非目标

- 列表行预览、全文搜索、把正文存进 `inbox.db`。
- 展示 thinking、tool call，或整段会话。

## 验收

- [ ] 打开收藏的 agent 详情，能看到最后一条用户 prompt 和最后一条 agent 回复。
- [ ] 流式拆成多段的回复拼成一条；中间有 tool call 时只取最后一段回复。
- [ ] agent 已从 host 消失时不请求 timeline，详情仍显示现有的缺失说明。
