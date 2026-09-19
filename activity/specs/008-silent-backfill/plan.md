# Plan

server/background-sync.ts：串行、单任务调度器，SDK context 通过 query wrapper / hooks 注入。数据目录的 history-checkpoints.json 以临时文件 + rename 原子保存版本和每 agent 活动签名；失败重试间隔五分钟，损坏检查点记录日志并按未完成重扫。回填版本常量仅在采集口径变更时更新。

resyncAgents 增加可选 AbortSignal，在 await 后、分页写入前检查；清理时 abort，关闭 store 后不会继续写。前端移除所有手动入口并轮询本地查询。测试覆盖跳过、变更、版本升级、失败重试、并发合并和取消。
