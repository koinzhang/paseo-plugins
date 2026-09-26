# 依据

- `shared/contracts.ts` 的 `Status` 已包含 `auto`、`conditional`、`manual`、`pending`、`disabled`、`inactive`。001 将 `conditional` 定义为满足条件才加载，`manual` 定义为只能用户显式调用。
- Skills 的 `manual` 来自各 provider 扫描：`disable-model-invocation`、`allow_implicit_invocation: false`、`skillOverrides: user-invocable-only`、`hide: true`。OpenCode 1.18 不把外来的 `disable-model-invocation` 当成仅手动，扫描结果保持 `auto`（010）。
- 列表过滤已在 `client/entries.ts` 的 `groupEntries` 完成，搜索不经过 RPC。
