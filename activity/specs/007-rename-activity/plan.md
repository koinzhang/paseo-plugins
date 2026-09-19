# 007 — Plan

## Phase 1（展示名）— 已完成

用户可见文案统一为 Activity；RPC / 数据路径当时保持 `tool-usage`。

## Phase 2（插件 ID）— 已完成

| 项 | 做法 |
|---|---|
| 最终 id | `activity` |
| 数据迁移 | `server/migrate-data.ts` `resolveActivityDataDir`：旧目录有内容且新目录空 → `renameSync` |
| 接线 | `defaultDataDir()` / background checkpoints 默认路径走迁移后的 dir |
| 清单 | `paseo-plugin.json` `id`、surface/sidebar、`package.json` name、日志 `[activity]` |
| Checkout | 仓库目录 `tool-usage` → `activity` |
| 安装 | `paseo plugin remove tool-usage`；`paseo plugin install <path-to-activity>` |
| 保持 | RPC `usage.*`；workspace panel 贡献 id `usage` |

数据路径：`~/.paseo/plugin-data/activity/`。

## 偏差（npm 发布名）

`package.json` `name` 已改为 scoped 名 `@koinzhang/paseo-plugin-activity`（移除 `private`、补 `files` 白名单）；npm 上 `activity` 已被占用。插件 ID / 数据目录不变；npm 包名只标识来源，`paseo-plugin.json` `id` 标识已安装插件。发布时仅需 `npm publish --access public`。
