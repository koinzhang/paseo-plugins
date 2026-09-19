# 边界场景（git-commit-push）

## 敏感文件

以下模式命中时**警告用户并排除**，不要自动 `git add`：

- `.env`、`.env.*`
- `*secret*`、`*credential*`、`credentials.json`
- `*.pem`、`*.key`、`local.properties`
- 内容含 token / api_key 的 json、yaml

## 仓库状态阻断

以下状态**停止提交**，告知用户并协助处理（详见各场景）：

| 状态 | 检测 | 处理 |
|------|------|------|
| rebase / merge 进行中 | `git status` 含 `rebase` / `merging` | 完成或中止后再提交 |
| detached HEAD | `git branch --show-current` 为空 | AskQuestion：checkout 分支或新建分支 |
| 无变更 | working tree clean | 告知并结束 |

## 分支名碰撞

创建 feature 分支前：

```bash
git show-ref --verify --quiet refs/heads/<branch>
```

- 已存在 → AskQuestion：切换到已有分支 / 换名
- 不存在 → `git checkout -b <branch>`

## 多组不相关改动

拆成多次 commit，每组依次 `git add <files>` + `git commit`；每次走完整 message 生成流程。

## pre-commit hook 失败

1. 修复 hook 报错
2. 创建**新 commit**（不要 `git commit --amend`）
3. 例外：用户明确要求 amend 且 HEAD 尚未 push

## Push 前检查

有 upstream 时：

```bash
git rev-list --left-right --count @{upstream}...HEAD
```

输出 `behind ahead`（左 behind，右 ahead）：

| 情况 | 处理 |
|------|------|
| behind > 0 | 告知用户需先 `git pull --rebase`，**停止 push**（不 AskQuestion）；用户明确要求协助时再执行 pull |
| ahead > 0 或 无 upstream | 继续 push |
| push 被拒（non-fast-forward） | 报告原因，建议 pull --rebase；不自动 force |

无 upstream：

```bash
git push -u origin HEAD
```

有 upstream：

```bash
git push
```

## 结果汇报补充

向用户汇报时建议包含：

- commit 短 SHA（`git rev-parse --short HEAD`）
- `git remote get-url origin`
- push 是否成功
- 是否仍有 unstaged / unstaged 残留（`git status`）

便于后续接 `git-mr` skill。
