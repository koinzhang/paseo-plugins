# Plan

- 删除 by-provider / activity-by-day handler 中同步 agents.list；将目录 upsert 和历史工具兜底放到 background-sync 每轮 list 后、扫描前，包含取消检查。
- skills-by-name 仅使用 ref.current 的 cwd，不等待 refresh；继续解析本地技能路径。
- Popover 使用 useUsagePillData，与图标共享 installation QueryClient 下 agent key、进行中请求及缓存；保留空数据快速轮询，有数据每 15 秒更新。
- 全局 query 禁用自动重试；已有缓存遇到刷新错误不隐藏。
- 回归测试覆盖本地查询不依赖 SDK、后台目录与取消，以及 QueryObserver 缓存复用。

## 038 修正

新 ref(id) 的 current() 为 null，不能用于取得项目 cwd。skills-by-name 对空句柄等待一次 refresh，失败保留 home roots 与统计；原“不等待 refresh”约束由此取代。聚合查询仍读本地库。
