# 021 Research

- 本机 Paseo `0.17.4`，参考 checkout `1ff119dc2a42825e7fdc46c504b6ccee52a4f8be`。
- `@getpaseo/plugin/client/ui` 导出 `Markdown`：`../paseo/packages/plugin/src/client/ui.ts:195`；官方说明见 `../paseo/public-docs/plugins/reference.md:1213`。它使用宿主主题、选择、代码块和链接行为，支持 web / iOS / Android，不附带页面边框或滚动容器。
- `paseo.agents.ref(id).refresh()` 返回 `PaseoAgent`，协议 `AgentSnapshotPayloadSchema.updatedAt` 见 `../paseo/packages/protocol/src/messages.ts:937`。本次沿用已有 `agentStates` 轮询，把该时间映射为 `lastActivityAt` 字段，不新增 SDK 连接或额外 RPC 查询。
- 缺失 / 请求失败的 agent 没有宿主 `updatedAt`，客户端用收藏时间 `Item.createdAt`，并显示 `starred` 标识；不会把 pin 改变的 `Item.updatedAt` 误当 agent 时间。
- 本次只改变展示，不改 note / agent 的持久化时间，不新增 timeline 读取。
