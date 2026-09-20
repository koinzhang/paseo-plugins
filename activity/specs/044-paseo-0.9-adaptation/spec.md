# 044 — 适配 Paseo 0.9.0-beta.2（047 修订）

## 目标

- requirements >=0.9.0-beta.2，SDK 精确 0.9.0-beta.2；不兼容 0.9 以前版本。
- 每个插件 API 实例自持独立目录 observation，不依赖宿主目录推送。
- 初始与重连 snapshot 全分页补全，实时增量与 15s 轮询协调。
- timeline 处理 subscription_restored / error，使用 SDK cleanup。
- Closed / Archived 仅接受明确字段，不从 remove / useAgent null 推断。

## 审查纠正

原 G2 禁止自持 observation、G4 保留推断 Closed 的设计已废除。045/046 补丁的陈旧缓存与归档即时显示目标由 047 统一解决；验收见 047/tasks.md。
