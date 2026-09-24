# paseo-plugins

Paseo 插件仓库。当前包含插件 **Activity**（`activity/`）：本地用量分析 **兼** workspace agents 运营——Global（习惯 / provider / 排行 / KPI 对比）、Workspace（Explorer 竖向 Agents 管理 + Terminals + 实时 attention）、Agent（会话工具明细）。

> 插件 ID / 目录名 / 数据目录：**`activity`**（原 `tool-usage`，见 `activity/specs/007-rename-activity/` Phase 2）。
> 架构总览：[`activity/docs/architecture.md`](./activity/docs/architecture.md) · 产品 README：[`activity/README.md`](./activity/README.md)

## Paseo 源码（查阅用）

本地 Paseo 仓库一般与当前 checkout 同级（`../paseo`），写插件时可直接查证 API / 契约 / daemon 实现：

- 本机路径：`/Users/koinzhang/Workspace/xws/paseo`；其他设备先 `ls ..` 确认，不存在就不要臆造路径（缺失时 `./scripts/sync-paseo.sh --clone` 浅克隆）
- 刷新：`./scripts/sync-paseo.sh`（fetch + fast-forward，只读不改内容）
- **不要**把 Paseo 改成 git submodule：jj 不支持，submodule 内容不会出现在工作副本里
- 常用位置：
  - `packages/plugin/src/` — 插件运行时与插件 API（surface / RPC / hooks 等）
  - `packages/protocol/` — RPC 与事件契约
  - `packages/server/` — daemon（插件加载、`plugin-data` 数据目录等）
  - `packages/cli/` — `paseo` CLI（`plugin install` / `reload` / `logs`）
  - `plugin-examples/` — 官方示例插件（surface、timeline、theme 等）
  - `skills/` — 上游 agent 技能；本仓库对应副本在 [`.agents/skills/`](./.agents/skills/)
- 只读查阅：不要在 paseo 仓库做修改
- 版本锚点：据源码得出的 API 结论，在对应 `specs/00N/research.md` 记录上游 commit + `paseo --version`（`sync-paseo.sh` 末尾输出可复制块）；上游 HEAD 可能领先于已发布契约

## Spec 驱动开发

编码前先读 [`activity/specs/README.md`](./activity/specs/README.md) 总览，再读对应编号目录（`001-usage-tracking` … `081-ranking-bar-animation`）：

| 文件 | 作用 |
|---|---|
| `spec.md` | 需求、目标/非目标、用户故事、验收标准（WHAT） |
| `plan.md` | 架构、数据源、分类规则、数据模型（HOW） |
| `tasks.md` | 任务拆解与验收，完成后勾选 |
| `research.md` | 已验证的源码依据与开放问题 |
| `contracts/` | RPC 契约与 SQL schema |

规则：

- 先改 spec / plan，再改代码；实现与 spec 出现偏差时先更新 spec 或记录偏差
- 每完成一个 task，在 `tasks.md` 勾选并写明验证方式
- 新的功能点建新编号目录（`specs/00N-...`），不要往旧目录里堆

## 常用命令

以下命令在 `activity/` 目录下执行：

```bash
npm run typecheck                 # 提交/安装前必跑
paseo plugin install "$PWD"       # 安装（id = activity）；必须绝对路径，daemon 按自身 cwd 解析相对路径
paseo plugin reload activity      # 源码改动后重载
paseo plugin logs activity        # 查看子进程日志
paseo plugin ls                   # 确认 running
```

改完 `client/` / `server/` / `shared/` / 入口 / `paseo-plugin.json` 后**主动** `paseo plugin reload activity`，不必等用户再说「重载」。

### 本地开发安装（默认）

本地开发**默认直接以 manifest ID `activity` 安装当前 checkout，不带 `--id`**（不再使用 `activity-dev`）。文档、spec 验收与命令示例一律写 `activity`：

```bash
paseo plugin ls                    # 先看 activity 是否已安装、SOURCE 指向哪里
paseo plugin install "$PWD"        # 未安装时；已指向本 checkout 则只需 reload
paseo plugin reload activity
```

- 同 ID 重复安装会被拒（`Plugin ID "activity" is already configured; choose another ID with --id`），不会覆盖已有安装
- `activity` 已被 npm 正式版或其他目录占用时：先 `paseo plugin remove activity` 再 `paseo plugin install "$PWD"`；本机若残留 `activity-dev` 实例也 `remove` 掉，避免出现两个 Activity 入口
- 数据目录由 `shared/plugin-id.ts` 的 `PLUGIN_ID` 硬编码，与安装来源无关：本地 checkout 与 npm 版都读写 `~/.paseo/plugin-data/activity/`，切换来源不丢数据

### 例外：与 npm 正式版并存

仅在用户明确要求同时保留 npm 正式版时，才用 `--id` 另起运行时 ID（**不要**改 `paseo-plugin.json` 的 `id`）：

```bash
paseo plugin install "$PWD" --id activity-dev
paseo plugin reload activity-dev
```

- 两个实例共库（同一 `usage.db`，SQLite WAL + busy timeout 保证并发写不报错），且会出现两个 Activity 入口
- 要完全隔离数据只能跑第二个 daemon（独立配置目录）

## 版本控制（jj）

本仓库存在 `.jj/`（colocate 模式），版本控制操作**优先用 jj**，git 只作远程契约（fetch / push / PR / CI）。

```bash
jj st / jj diff / jj log                    # 查看
jj describe -m "..." && jj new              # 提交（无暂存区，改动自动 snapshot）
jj bookmark set main -r @ && jj git push    # 推送
jj undo / jj op log / jj op restore         # 恢复
```

约束：

- 不要用 git 做写操作（`git add` / `commit` / `checkout` / `reset` / `stash`）；只读命令（`git log` / `status` / `diff`）可用
- **不要点 Paseo 的 commit 按钮**（内部是 `git add -A && git commit`，会与 jj 工作副本状态错位）；需要提交时用 jj
- worktree 隔离的 workspace 没有 `.jj`：jj 不可用，也不要执行 `jj git init --colocate`（会与主 checkout 形成双 store）

## Commit 格式

提交信息（`jj describe` / git commit）使用 Conventional Commits：`<type>(<scope>): <description>`。

- type：`feat` / `fix` / `docs` / `style` / `refactor` / `perf` / `test` / `build` / `ci` / `chore` / `revert`
- scope：插件 id（如 `activity`）或 `ci` / `docs` / `repo`
- 发版：`chore(activity): release X.Y.Z`

完整约定见 [`CONTRIBUTING.md` § Commit messages](./CONTRIBUTING.md#commit-messages)。

## 发 npm 包

**不要**只靠 push `main` 发版。流程：bump `activity/package.json` version → 合进 `main` → 打 tag `activity-vX.Y.Z` → `gh release create` → `.github/workflows/publish.yml` 用 npm Trusted Publisher 自动 `npm publish`。

完整步骤见 [`CONTRIBUTING.md` § Publishing to npm](./CONTRIBUTING.md#publishing-to-npm)；用户说「发版 / publish / release npm」时读 [`.agents/skills/publish-npm/SKILL.md`](./.agents/skills/publish-npm/SKILL.md) 并按其执行。

## 约束

- **产品名（用户可见）**：Activity
- **插件 ID**：`activity`（与 checkout 目录名一致）
- **架构**：三层 Global / Workspace / Agent — 见 [`activity/docs/architecture.md`](./activity/docs/architecture.md)
- 数据目录：`~/.paseo/plugin-data/activity/`（不要写进插件 checkout）；默认 SQLite `usage.db`
  - 升级：首次启动若仅有旧目录 `…/plugin-data/tool-usage/`，自动 rename 迁入 `activity/`
- 客户端 UI 只用 React Native 原语 + `theme.colors` / `layout.compact` + `client/design-tokens.ts`（字号 / 间距 / 圆角 / 图标；规范见 [`activity/docs/design-system.md`](./activity/docs/design-system.md)，`npm test` 拦截裸数值）
- 主入口：
  - 本 agent：composer pill + agent workspace panel（标题 Activity）
  - 全部 + 按 provider：侧边栏 **Activity** surface
  - 不保留 greeting 模板
- 查询面以本地库为准；Paseo timeline / `agents.list` 只作采集与回填源
- `activity/.cache/` 为本地截图 / 临时缓存，已 gitignore，不要提交
- RPC 名仍为 `usage.*`（契约稳定，不随插件 ID 改名）
