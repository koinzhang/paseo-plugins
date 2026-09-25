# 011 — Plan

- 在 `index.client.tsx` 注册 `context: "agent"` 的 `addSlashCommand`，卸载时清理。
- 命令从回调的 `agent.provider` 和 `workspace.projectRootPath` 取值，分别判断 provider 是否受支持、project root 是否非空。两者都不可用时跳过设置读写。
- 至少有一个值可用时，通过 `settingsRpc("board-selection")` 读取 host 级选择，只替换可用字段，带 revision 原子写入；冲突时重读并重试一次。写入完成后打开现有 `customize` surface；读写错误也打开。
- Surface 继续用现有 `useSettings` 响应 host 设置变化，无需新增跨页面状态。
- 单元测试覆盖两个值均有效、仅 provider 有效、仅 project 有效、两个值都不可用与写入冲突；运行 Customize 测试和 typecheck，再重载插件。
