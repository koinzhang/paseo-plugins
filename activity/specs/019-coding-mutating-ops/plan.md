# 019 — 实现方案

## 1. `shared/usage.ts`

导出：

- `shellLooksMutating(command)`
- `isCodingOp(row)` = `isFileWrite(row) || (isShellCall(row) && shellLooksMutating(row.command))`

`MUTATING_HEADS`（常见开发写盘，首词 basename）：

`rm rmdir mv cp mkdir touch chmod chown ln unlink install tee truncate dd sed perl`
`npm npx pnpm yarn bun pip pip3 poetry uv cargo composer bundle`
`make cmake ninja tsc webpack vite esbuild rollup`

`GIT_MUTATING_SUBS`：

`add commit checkout switch merge rebase cherry-pick stash clean reset restore mv rm`
`pull push clone init fetch am apply revert submodule worktree`

`aggregateByProvider` 的 `codingAgentIds` 改用 `isCodingOp`（不再因 read / 任意 shell 入 coding）。

## 2. 测试

`usage.test.ts`：mutating 谓词 + codingAgentCount 样例（read≠coding；`git status`≠；`npm i`/`>`/`edit`=）。

## 3. 文档

更新 `018` 口径引用指向 019；`specs/README.md` 增加 019。
