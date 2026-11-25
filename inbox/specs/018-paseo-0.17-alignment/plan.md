# 018 Plan

## 实现

- 依赖固定 0.17.4，再用授权的 `npm install --ignore-scripts --no-audit --no-fund` 同步实际安装与 lockfile；不运行依赖生命周期脚本。
- `shared/changes.ts`：最小 invalidate schema 与 `defineSubscription`。
- `server/changes.ts`：单实例广播器。每份 subscription 有独立发送循环，用 dirty 位合并通知；handler Promise 仅在 abort、cleanup 或 push 失败时结束。
- `server/store.ts`：注入 onChange 回调，实际 SQL 修改后通知；读取时同步标签名称仅在确有变化时通知，避免刷新循环。数据库结构不变。
- `index.server.ts`：生命周期持有 broadcaster / store / daemon；注册订阅与 archive/create hook；cleanup 先关闭广播器，再关闭 daemon 和 store。
- `server/handlers.ts`：保留现有查询与 mutation，反归档 finally 失效；状态查询引起的标题同步由 store 回调广播。
- `client/changes.ts` 与 client entry：一份安装级订阅，建立 / ready / 失效 / 失败时刷新，失败定时重试，cleanup 取消，过期 handle 回调隔离。
- `client/inbox-surface.tsx`：复用 onItemsChanged，将失效查询范围扩到整个 Inbox namespace；不取消状态轮询或改动 note 草稿的 tab 生命周期。
- `shared/note.ts`：远端正文同步的纯逻辑；仅在 current 与 saved 相同的 clean editor 中接收 incoming，未保存的本地编辑不覆盖。
- `client/workspace-panel.tsx`：用当前缓存 workspace.ref lookup，移除 deprecated string lookup；不存在时继续显示 unavailable。

## 验证顺序

1. 基线与 scoped diff；上游实际导出与安装版本核验。
2. 最小 server/client 广播测试与 store regression，验证事件仅 invalidate、背压、abort、失败、重试与 cleanup。
3. `npm run typecheck`，修复真实 0.17.4 类型差异；再串行 `npm test`。
4. `npm ls @getpaseo/plugin @getpaseo/client @getpaseo/protocol` 与完整 diff / `git diff --check`。
5. 在 tasks 记录实际命令、退出码与数量；真实跨客户端传输、GUI、归档恢复和 reload 交主 agent。
