# Tasks

- [x] 脚手架：`paseo-plugin.json`、`package.json`、`tsconfig.json`、入口文件；README 表格（中英）、CI matrix。`npm run typecheck` 通过。CONTRIBUTING 发布表与 `publish.yml` 留到首次发布时再加（`package.json` 暂为 `private`）。
- [x] `shared/project-key.ts` remote 规范化，附单测（ssh / https / 带端口 / `.git` 后缀 / 本地路径）。`npm test` 通过。
- [x] `server/project-key.ts`：remote → 仓库根 → cwd，附单测（临时 git 仓库、worktree、非 origin remote、子目录、非 git 目录）。`npm test` 通过。
- [x] `server/store.ts` SQLite 与 schema，附单测（CRUD、agent 唯一性、置顶排序、搜索通配符转义、重开持久化）。`npm test` 通过。
- [x] RPC 契约与 handlers（`items.list/save/update/delete`、`agents.star/states/unarchive`）。typecheck 通过。偏差：没有单独的 `projects.resolve`，`items.save` 接收 `cwd` 在 server 端解析；`agents.status` 改名为 `agents.states`（批量）。
- [ ] `agents.unarchive`：先 inspect / restore workspace，再 `refreshAgent`（已实现，typecheck 通过）；三种情况中已实测活动 workspace（`workspace_not_archived` → 跳过），已归档 workspace、worktree 已删除两种尚未实测。
- [ ] Inbox surface：分组、project 筛选、搜索、编辑、置顶、删除；compact 布局；主题检查。
- [ ] 收藏条目状态（仅 `agents.states` RPC；surface 中不能用 useAgent），「已归档 / 不可用」展示与 Unarchive 按钮。
- [ ] Command Center 三项 + `/inbox` slash command。
- [x] `/inbox` 无参数时收藏当前 agent（改为 agent context）。
- [ ] 空笔记不保存：草稿在第一次非空保存时才创建，离开时删除空 note，server 拒绝创建空 note，启动时清理（store 单测 + `isEmptyNote` 单测通过，`npm test` 16 项）；app 内手动验证未做。
- [ ] 安装、reload、`paseo plugin ls` 为 running（已完成：本机安装后 running，日志 Plugin ready）；多 host 切换手动验证（未做）。
