# Tasks

- [x] T1 静默调度器、持久化版本检查点和卸载取消。测试覆盖首次/无变化/活动更新/版本升级、失败重试、并发合并、关闭后不写数据库。
- [x] T2 移除全局、panel、Command Center 手动入口与公开 resync RPC；统计每 15 秒刷新，已有内容刷新时不隐藏。
- [x] T3 npm run typecheck、npm test（80/80）通过。git diff --check 通过；插件重载 running，日志 Plugin ready；真实后台已为 36 个会话写入成功检查点。
