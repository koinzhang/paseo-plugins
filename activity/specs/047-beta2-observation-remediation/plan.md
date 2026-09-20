# Plan

统一 watchAgentDirectory：WeakMap 按 agents API 引用共享 includeArchived observation 与完整内存快照；直接监听返回 subscription，避免 agents.subscribe 混合多个过滤范围。分页期间缓冲增量，重连以新 snapshot 重建，轮询读取不中断 observation；AbortController 清理 bootstrap，release 错误捕获。

pill directory、attention、workspace statuses、workspace refresh 均使用此目录。去掉 useAgent→状态缓存桥接，目录为唯一状态源；Workspace 将明确 archivedAt 投影到 usage.agents 行，统计仍来自 RPC。045/046 的目标保留，但废除以 remove/null/Closed 推断归档与按时间戳锁住 Closed 的实现。

依据：Paseo packages/client/src/index.ts createPaseoApi/listAgents；packages/app/src/plugins/surface-runtime.ts；packages/app/src/plugins/client-state/source.ts；packages/client/src/timeline-subscription/index.ts。
