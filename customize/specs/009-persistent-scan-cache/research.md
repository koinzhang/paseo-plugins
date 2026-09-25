# 依据

- Paseo `packages/server/src/server/paseo-home.ts` 解析 `PASEO_HOME`，默认 `~/.paseo`；`packages/server/src/server/plugins/runtime.ts` 的插件子进程继承 daemon 环境。本机源码锚点 `49f9cec6be01ef7e7604dadf127425eac6493820`，`paseo --version` 为 `0.9.1`。
- Paseo 插件 RPC 支持服务端 handler 和客户端 `useRpc`；客户端继续用 React Query 管理请求状态。现有 Customize 扫描 RPC 返回列表与 `scannedAt`，适合作为版本化 JSON 快照。
- 006 的仅内存缓存由 `gcTime: Infinity` 和 `refetchOnMount: "always"` 实现。新查询先读取磁盘快照，再按过期状态决定是否调用实时扫描 RPC；Provider 和项目查询仍沿用旧策略。
