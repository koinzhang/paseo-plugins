# 047 — beta.2 observation 与生命周期修复

## 目标

- 只面向 Paseo >=0.9.0-beta.2；以 beta.2 SDK 和同版本宿主源码为依据。
- 每个 PaseoApi 实例自持目录 observation；同实例消费者共享，最后一个卸载时释放，独立 surface 不依赖 entry 或宿主事件。
- 初次与重连 snapshot 补全分页，并重放读取期间的增量；15s 轮询兜底，订阅失败重建。
- 生命周期仅取目录明确 status；remove 表示不在目录，不推断 Closed；useAgent 空值与缓存不参与生命周期覆写。
- 归档仅取明确 archivedAt（包括 null 反归档）；宿主状态覆盖 UI registry 行，避免慢 RPC 抹掉已收到的归档更新。
- timeline 清理使用 SDK 可调用 cleanup，其内部处理 release rejection。

## 非目标

不兼容旧单 slot API；不发版，不唤醒 agent 验证，不改变统计采集与本地库查询架构。

## 验收

真实 beta.2 SDK 契约测试覆盖实例隔离、分页与并发增量、重连、卸载与失败；生命周期/归档测试覆盖空值、remove、Closed 未归档和反归档。typecheck、全量单测、reload running。
