# 009 — Activity 快速打开

统计查询不等待 Paseo agent 列表或刷新；只读取本地统计库和已缓存的 agent 快照。目录同步、历史补扫在后台完成。
Pill 和 Popover 共享同一份查询缓存：Pill 已有数据时打开弹层直接显示，后台刷新不清空内容。全局统计刷新失败时保留已有数据并显示错误，首次失败不自动重试拖长 Loading。

验收：SDK 列表/刷新不可用时统计仍返回；已有 Pill 缓存打开 Popover 无首次加载态；后台仍登记无工具记录的 agent，并保留历史工具推断；停止后不得写库。

## 038 修正

新 ref(id) 的 current() 为 null，不能用于取得项目 cwd。skills-by-name 对空句柄等待一次 refresh，失败保留 home roots 与统计；原“不等待 refresh”约束由此取代。聚合查询仍读本地库。
