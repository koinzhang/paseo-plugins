# 018 Research

## 锚点与继承证据

- 日期：2026-11-25。
- paseo-plugins HEAD：`5326249867269f7cda3a70315d584a3da886a218`。
- 只读上游 `../paseo` HEAD：`1ff119dc2a42825e7fdc46c504b6ccee52a4f8be`；plugin/client/protocol package version `0.17.4`；已确认本机 runtime `0.17.4`。
- 开始时 inbox 仅有 017 文档改动，其他插件的并行改动不属于本任务。
- [017 research](../017-paseo-0.17-audit/research.md) 的 archived 缓存过滤、project identity、恢复和 bounded timeline 证据继续有效；新授权允许落地此前因依赖 / public contract 暂缓的订阅。

## 采用接口

上游路径相对 `../paseo`：

- `packages/plugin/src/rpc.ts` / `packages/plugin/src/index.ts`：defineSubscription 的 input / event schema，事件与 RPC 共享命名空间。
- `packages/plugin/src/server/contracts.ts`：subscription handler 的 push / AbortSignal；返回 pending Promise 表示存活，resolve 表示结束，reject 表示失败。
- `packages/plugin/src/client/contracts.ts` 与 `packages/plugin/src/rpc.ts`：client.subscribe 的 handle.ready、release 和 onClosed；无须每个 React 视图重复建立连接。
- `public-docs/plugins/reference.md` 的 Stream events / Handler lifetime：每客户端独立 handler；断线 abort，重连 / reload 重建 handler，不重放错过事件。因此初始 invalidate 与重新查询是协议的一部分。
- `packages/plugin/src/client/client-state.tsx`：useWorkspace 接受 WorkspaceRef，string id 为待移除 compatibility；`packages/plugin/src/contracts.ts` 提供 workspace.ref。面板继续保留 ID / workspaceId，不新增 agent panel。
- `packages/client/src/daemon-client.ts` 的 restoreWorkspace 设置 timeout 0，等待终态或断连；同步 client 0.17.4 后自动采用，无自定义 recovery 重试。
- `packages/plugin/package.json` peerDependencies 固定 client / protocol 0.17.4；本次显式声明开发 protocol，避免依赖自动解析掩盖版本漂移。
- `packages/server/src/server/plugins/subscription-handlers.ts`：初始 push 会等待 subscription acknowledgement，随后 sendAndWait 支持背压；返回的 handler Promise 结束 / 拒绝会关闭订阅。事件先验证，再发送原对象，因此本次 event schema 用 strict 拒绝任何正文等额外字段。
- `packages/app/src/plugins/subscriptions.ts`：瞬时断线由 owned subscription 自动重建；收到 closed / error 时会 abort 并释放 owner。客户端保留同一 handle 的重连依赖初始 invalidate，不依赖 ready Promise 再次 settle；显式 closed / readiness 失败则走本插件的重试。

## 实际安装核验

- 授权安装同步了 plugin / client / protocol / relay 四个 Paseo 包，未更新无关 package。
- 三个直接相关包在 package.json、package-lock.json、node_modules 均为 0.17.4；`npm ls` exit 0，无 invalid。
- 0.17.4 安装包的 `dist/index.d.ts` 实际导出 defineSubscription，`dist/client/index.d.ts` 实际导出 useWorkspaces 与 PluginSubscriptionHandle；类型检查不是针对旧 SDK。

## 未采用

- 不用 useAgents 代替服务端逐 id refresh：`packages/app/src/plugins/client-state/source.ts` 排除 archived agent，缓存缺失不是 missing。
- 不用 projectId 代替 git remote key；不迁移 SQLite schema / 数据。
- 不用 wholeTurns 改变 007 的 5 × 80 行预算或分别最新 prompt / reply 的语义。
- 不把公开 reload 当作完整恢复，它没有 workspace recovery。内部调用保留顺序，但实际依赖对齐 0.17.4。
- 不添加文件 watcher；所有插件写入由单个共享 store 通知，订阅本身无数据库读写。

## 验证边界

本轮可以验证实际 0.17.4 安装、编译、单元测试和 handler 逻辑。真实 host 网络断线、多个设备 UI、provider session 恢复以及 reload 的应用状态需上级统一验收，不由纯逻辑测试代替。
