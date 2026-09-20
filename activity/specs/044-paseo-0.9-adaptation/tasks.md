# 044 — tasks（历史执行记录）

> T3/T5 的设计假设已在 047 推翻；当前实现与验收以 047 为准。

- [x] T1 spec / plan / 索引 — 验证：目录与 README 行存在
- [x] T2 bump `@getpaseo/plugin` + `requirements.paseo` + version 0.5.0 — 验证：package.json / paseo-plugin.json
- [x] T3 撤销 client 自持 `list({ subscribe })`（Closed 回归）— 验证：index.client 无 observation；注释说明
- [x] T4 timeline `subscription_restored` / `error` + release cleanup — 验证：typecheck
- [x] T5 轮询保留 closed + docs / CHANGELOG — 验证：文件已更新
- [x] T6 test / typecheck / reload — 验证：单测 pass、typecheck pass、reload running
