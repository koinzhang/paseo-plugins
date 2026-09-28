# 020 — Tasks

- [x] 核对各 provider 宿主版本诊断与输出格式；验证：上游源码、实际 SDK diagnostic 的 Version 行。
- [x] 通用版本探测与回归覆盖；验证：`provider-version.test.ts` 覆盖全部 ProviderId、宿主优先、fallback/失败、前缀/日期版本及实际 CLI 名。
- [x] 移动顶部版本展示、兼容图标顺序、中英文与机制说明；验证：源码层级为兼容图标 → 条件版本 Text → Provider；版本统一 `v` 前缀，未知时不渲染 Text，已删除 unknown 占位文案；版本文本使用 TEXT.meta 与 foregroundMuted。
- [x] 升级快照、README/spec 索引并验证；验证：快照 v4 保留版本信息并拒绝旧 v3，`scan-snapshot.test.ts` 通过。
- [x] typecheck / tests、真实 RPC、插件 reload/running；验证：56 项测试与 typecheck 全通过，真实 RPC 获得 Claude 0.1.8、Codex 0.157.1、Cursor 2026.09.26-dd393fe、OpenCode 2.0.18、Pi 0.87.1、OMP 18.3.5。
- [ ] 宽屏/紧凑页面目视验收：原生 UI 工具超时；临时本地前端连接 daemon 返回 Transport closed (1006)，未修改宿主允许来源设置。布局换行与主题 token 已通过源码核对，页面目视验证留待可连接的宿主 UI。
