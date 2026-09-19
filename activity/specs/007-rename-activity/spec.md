# 007 — 产品改名：Activity（展示名 + 插件 ID）

- 状态：Phase 1+2 已完成
- 日期：2026-09-19
- 依赖：001–006（产品已含 tools / agents / messages 规划）

## 1. 背景

插件已从「仅 tool 统计」扩展为三维活动视图（tools、agents、messages），侧边栏名 **Tool Usage** 过窄。选定对外产品名为 **Activity**（对齐 ChatGPT activity；避开 Paseo「Agent profiles」与账单 Usage 歧义）。

**插件 ID / 安装 id / 数据目录 / checkout 目录** 现为 **`activity`**（Phase 2）。旧 `tool-usage` 数据目录在首次启动时 rename 迁入。

## 2. 命名对照

| 层 | 现值 |
|---|---|
| 用户可见产品名 | **Activity** |
| 侧边栏 / panel / popover / CC | **Activity** |
| Surface / sidebar `id` | **`activity`** |
| `paseo-plugin.json` `id` | **`activity`** |
| 数据目录 | `…/plugin-data/activity/`（旧 `tool-usage/` 自动迁移） |
| checkout 目录名 | **`activity`** |
| npm 发布包名 | **scoped**（如 `@koinzhang/paseo-plugin-activity`）；不能是 `activity`，见 §8 |
| 日志前缀 | `[activity]` |
| RPC 名 `usage.*` | **保持**（契约稳定） |
| Workspace panel 贡献 `id` | `usage`（内部；用户不可见） |

最终插件 ID：`activity`。

## 3. 目标

| ID | 目标 | 阶段 |
|---|---|---|
| G1 | 所有用户可见入口统一为 Activity | Phase 1 ✅ |
| G2 | Spec / AGENTS / README 以 Activity 为产品名 | Phase 1 ✅ |
| G3 | 关键词补充 activity（保留 usage/tool） | Phase 1 ✅ |
| G4 | 插件 id、数据目录、安装迁移方案落地 | Phase 2 ✅ |

## 4. 非目标

| ID | 非目标 |
|---|---|
| NG2 | 不改 RPC 名 `usage.*` |
| NG3 | 不改名为 Profile（与 Agent profiles 冲突） |

## 5. Phase 1 — 用户可见文案（验收）

- [x] 侧边栏项 title = `Activity`
- [x] Workspace panel title = `Activity`
- [x] Popover 标题 = `Activity`
- [x] Command Center 文案含 Activity；export 剪贴板；rescan 由 008 取代
- [x] 导出 markdown `# Activity report`
- [x] pill / 空态等用户可见残留改为 Activity

## 6. Phase 2 — 插件 ID

### 6.1 已落地

1. 最终 id：`activity`
2. 数据迁移：`resolveActivityDataDir()` — 若 `plugin-data/activity/` 为空且 `plugin-data/tool-usage/` 有内容 → **rename** 整目录（含 `usage.db`、checkpoints）
3. `paseo-plugin.json` id、surface/sidebar id、日志前缀、`package.json` name、checkout 目录名均改为 `activity`（npm 发布名偏差见 §8）
4. 文档 / CLI：`paseo plugin reload activity`
5. 用户需 `paseo plugin remove tool-usage` 后 `paseo plugin install <activity-checkout>`（id 变更无法原地 reload 成新 id）

### 6.2 验收

- [x] 新装：仅 `activity` 数据目录
- [x] 升级：旧目录有数据时启动即迁入，不丢库
- [x] `paseo plugin ls` 显示 `activity`；移除旧 `tool-usage` 安装项

## 7. 文档同步

- `AGENTS.md`、`specs/README.md`、本目录 tasks
- RPC 契约名 `usage.*` 保持；client queryKey 前缀改为 `activity`

## 8. 偏差记录

| 日期 | 项 | 原定 | 实际 / 处置 | 原因 |
|---|---|---|---|---|
| 2026-09-19 | npm 发布包名 | `package.json` `name` = `activity` | 已改为 scoped 名 `@koinzhang/paseo-plugin-activity`（移除 `private`、补 `files` 白名单）；插件 ID / 数据目录不变 | npm 上 `activity` 已被无关包占用（v0.1.1），且未 scoped 名不可发布 |

- 不影响插件 ID / 安装 id / 数据目录：Paseo 文档明确 **npm 包名只标识来源，`paseo-plugin.json` 的 `id` 才标识已安装插件**（`.agents/skills/paseo-plugin-doc/references/publishing.md`）。
- 本地改名已完成（T14a）；发布时仅需 `npm publish --access public`（T14b）。
