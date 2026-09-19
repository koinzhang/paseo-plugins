---
name: git-commit-push
description: 分析当前 git 仓库的变更，生成 commit message 并提交推送。默认自动执行；仅在多仓歧义、default 首次分支策略、文件范围不清等场景 AskQuestion。Use when the user mentions commit, 提交, 推送, push, 提交代码, commit and push, 同步代码, diff-tab commit-and-push, or wants to commit and push changes.
---

# Git Commit & Push

分析变更、生成 commit message、执行 commit 与 push。

**原则**：用户触发本 skill 即表达提交意图。**默认自动执行**步骤 1–10 并汇报；仅在下方场景 AskQuestion。

**详细规则**：[references/repo-discovery.md](references/repo-discovery.md)（仓库定位）、[references/edge-cases.md](references/edge-cases.md)（边界场景）。

## 唯一需 AskQuestion 的场景

默认全程自动、不确认。**只有**下列情况才问，其余一律自动决策后直接执行：

| 场景 | 询问 |
|------|------|
| 多仓有变更且上下文无法判定目标仓 | 选仓库 |
| 在 default branch + 用户未指定 + 会话无先例 + **仓库历史非主干开发** | `current`/`new-branch` |
| unstaged 且变更分属多组不相关、或 >15 个且归属不清 | 多选文件 |
| 命中敏感文件 | 警告后确认排除 |
| detached HEAD / 新建分支名已存在 / 拆分方案不明 | 见 edge-cases |

**推送意图**：消息含 push/推送/commit-and-push/同步 → commit+push；仅「提交」→ commit-only。

## 工作流

### 1. 定位仓库

按 [repo-discovery.md](references/repo-discovery.md)；单 dirty 仓或上下文明确 → 直接进入，不问。

### 2. 收集状态

并行执行：

```bash
git status
git diff
git diff --cached
git log --oneline -10
git branch --show-current
git rev-parse --abbrev-ref @{upstream} 2>/dev/null || echo "(no upstream)"
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null || true
git rev-list --left-right --count @{upstream}...HEAD 2>/dev/null || true
```

- clean → 结束
- 阻断状态 → [edge-cases.md](references/edge-cases.md)
- default branch：`origin/HEAD` → `git remote show origin | grep 'HEAD branch'` → `master` / `main`

### 3. 分支策略

满足任一即直接用当前分支，不问：非 default 分支、用户已指定分支、会话已在此分支提交过、IDE 已给 `Current branch`、会话习惯在 default 直接提交、**仓库为主干开发**（见下）。仅当在 default 且以上全不满足时才问 `current`/`new-branch`。需新建时 `git checkout -b <name>`（碰撞见 edge-cases）。

**主干开发判定**（用步骤 2 的 `git log -10`）：近期 default 分支提交多为非 merge 的直接提交（少见 MR/PR merge commit）→ 视为主干开发惯例，直接在 default 提交，不问。

### 4. 分析变更

判断 type、范围、目的。多组不相关改动 → 拆分多次 commit（每组自动执行，除非拆分方案不明才问）。

### 5. 生成 Commit Message

以 `git log -10` 镜像风格。敏感文件检查见 edge-cases。

### 6. 选定暂存文件

自动选定（不问）：有 staged → 只提交 staged，不额外 add；否则当会话改动与 `git status` 一致且 ≤15 个、或用户点名路径、或变更同属一目录/模块时，`git add` 这些文件。禁止 `git add -A`/`git add .`。无法判定归属 → 才 AskQuestion 多选。

### 7. 确认（默认跳过）

仅当上方「唯一需 AskQuestion 的场景」命中、或用户可能要改 message/范围时才确认：`commit-push` / `commit-only` / `cancel`。

### 8. 提交

```bash
git commit -m "$(cat <<'EOF'
<message>
EOF
)"
```

### 9. 推送

Preflight 见 edge-cases；`git push` 或 `git push -u origin HEAD`。

### 10. 汇报

文件列表、message、短 SHA、`origin` URL、push 结果、残留变更（`git status`）。

## 注意事项

- 用户指定 > 会话习惯 > 仅 default 首次才问分支
- 禁止 `--force` push；禁止提交敏感文件（edge-cases）
