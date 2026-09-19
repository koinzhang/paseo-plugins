# paseo-plugins

Paseo 插件仓库。当前包含插件 **Activity**（`activity/`）：统计 **工具使用**、**agent 创建**、**用户发送次数**，以及发送时的 **model**（按消息加权）。

> 插件 ID / 目录名 / 数据目录：**`activity`**（原 `tool-usage`，见 `activity/specs/007-rename-activity/` Phase 2）。

## Spec 驱动开发

编码前先读 [`activity/specs/README.md`](./activity/specs/README.md) 总览，再读对应编号目录（`001-usage-tracking` … `015-model-usage`）：

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
paseo plugin install .            # 安装（id = activity）
paseo plugin reload activity      # 源码改动后重载
paseo plugin logs activity        # 查看子进程日志
paseo plugin ls                   # 确认 running
```

改完 `client/` / `server/` / `shared/` / 入口 / `paseo-plugin.json` 后**主动** `paseo plugin reload activity`，不必等用户再说「重载」。

## Commit 格式

创建 git commit 时使用 Conventional Commits：`<type>(<scope>): <description>`。

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
- 客户端 UI 只用 React Native 原语 + `theme.colors` / `layout.compact`
- 主入口：
  - 本 agent：composer pill + agent workspace panel（标题 Activity）
  - 全部 + 按 provider：侧边栏 **Activity** surface
  - 不保留 greeting 模板
- 查询面以本地库为准；Paseo timeline / `agents.list` 只作采集与回填源
- RPC 名仍为 `usage.*`（契约稳定，不随插件 ID 改名）
