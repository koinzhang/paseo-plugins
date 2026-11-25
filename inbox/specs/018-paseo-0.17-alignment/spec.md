# 018 Paseo / SDK 0.17.4 全面对齐

## 背景与授权

承接 [017 审查](../017-paseo-0.17-audit/research.md)。2026-11-25 用户将目标从「有收益才更新」改为「彻底对齐 0.17.4」，明确授权安装 SDK / client、同步 lockfile 和新增订阅契约。本 spec 取代 017 的暂缓升级决定，不改写历史审查证据。

## 已定决策

1. `@getpaseo/plugin`、`@getpaseo/client` 与开发用 `@getpaseo/protocol` 固定为 `0.17.4`；manifest 最低宿主为 `>=0.17.4`。保留插件自身版本，不发版。
2. 共享 SQLite store 仍是唯一查询源，schema / project key / host 数据隔离不变。所有实际 store 写入在 SQL 成功后发失效通知；重复收藏、未改变的标签名称 / agent 标题等无变化路径不广播。
3. 新增 `items.changes` 订阅，事件仅 `{ type: "invalidate" }`，strict schema 拒绝笔记、条目 ID、标签等额外字段。每次订阅开始都发同一事件，要求客户端重读查询；不依赖 replay。
4. 每个 plugin client installation 只持有一份订阅，复用现有安装内通知刷新所有已挂载 Inbox 视图。失效重查 items、states、agent candidates、tag options 和最后对话；保留 10s agent 状态轮询，它负责当前状态与改名，不把活动缓存缺失当 missing。
5. 订阅失效 / 建立失败时先刷新，再定时重建；重连后服务端新 handler 的初始失效触发全量刷新。清理时停止重试、释放 handle；过期回调不能触发当前安装的查询。
6. 服务端每个订阅只持有内存回调，最多一个 push 在途、一个合并后的待发送失效。等待 push 背压不阻塞 SQLite 写入或其他客户端；abort / push 失败 / plugin cleanup 移除回调，无 watcher 或订阅内 SQLite 连接。
7. 归档 hook 发失效；Inbox 反归档仍先 inspect / restore workspace，再 refreshAgent。恢复失败也刷新，避免部分恢复后 UI 停留旧状态。内部 client 跟随 0.17.4 的等待恢复终态语义，不执行真实恢复验收。
8. 移除 deprecated workspace panel `context` 注册字段，workspace 缓存 lookup 使用新 `WorkspaceRef`；保留 panel ID、workspaceId、已有 tab / params 语义。Inbox 没有 agent panel，不为使用 addAgentPanel 而新增面板。
9. 重查得到远端 note 正文时，仅同步到没有未保存修改的 editor；保留正在编辑的本地 title / body，不新增协作编辑或冲突合并。

## 非目标

- 修改其他插件、根配置、上游，或 commit / push / publish / reload。
- 用 metadata 或文件面板 API 替代 SQLite，改变历史正文读取预算。
- 将跨客户端并发编辑升级为锁、协作编辑或冲突解决系统。

## 验收

- 实际安装的 plugin/client/protocol 都为 0.17.4，`npm ls` 无 invalid，0.17.4 下 typecheck 与完整测试通过。
- note/scratch 创建、编辑、删除、晋升、pin、star、tag、标题 / 标签同步触发失效；失败写入不广播。
- 同一插件两份客户端订阅独立收到失效，慢客户端不阻塞快客户端，abort / 失败 / cleanup 后不再收到通知。
- 建立、关闭、重连、重试、取消后的刷新与陈旧回调隔离由纯逻辑测试覆盖；真实 WebSocket 重连仍由上级验收。
- archived / missing、git remote key、workspace-first 恢复、SQLite schema 与现有标签 / notes / scratch 测试保留。
- 检查完整 inbox diff、untracked 文件及依赖 lockfile；没有越界修改。
