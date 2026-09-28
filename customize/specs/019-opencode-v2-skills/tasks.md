# 019 — Tasks

- [x] 核对宿主版本能力、OpenCode v2 metadata 与本机版本；验证：公开 SDK / protocol / diagnostic 源码、官方 v2 文档、`opencode --version`。
- [x] 实现宿主优先 / CLI fallback 版本探测与回归测试；验证：`opencode-version.test.ts` 覆盖 host 优先、缺失/失败/超时/不可解析回退及未知版本。
- [x] 实现按版本判断技能自动发现与禁用优先级，补齐 scanner 测试；验证：`providers.test.ts` 覆盖 v1/v2/未知、原生/兼容目录、布尔/字符串、deny/ask 与路径 ID。
- [x] 更新扫描快照、机制中英文说明和 README，并验证旧快照失效；验证：`scan-snapshot.test.ts` 覆盖 v3 版本来源持久化及拒绝 v2 快照，`compatibility.test.ts` 覆盖机制说明。
- [x] 跑 typecheck / Customize 测试、本机 skill 扫描；验证：`npm run typecheck` 与 53 项 `npm test` 全通过；`paseo plugin reload customize` 后 running / Plugin ready；实际 `customize.scan` RPC 获得宿主版本 2.0.18，143 skills 中 132 manual；`customize.cached-scan` 返回 fresh 且保留 host 来源。
