# 024 — Tasks

- [x] `Entry.tokens` 契约字段
  - 验证：`shared/contracts.ts` 增加可选 `tokens`；`npm test` 中快照/预览用例通过，旧快照缺字段仍可读。
- [x] `server/tokens.ts` 估算器与插件递归
  - 验证：`server/tokens.test.ts` 7 项全过（ASCII 400 字符 = 100、15 个汉字 = 10、空串 = 0；插件组件目录求和、`node_modules` 与 `.js` 不计入；MCP、非 manifest 插件与空插件返回 `undefined`）。
- [x] 扫描接入
  - 验证：`scanProvider` 返回 `withTokens(...)`；真实扫描 `pi` provider 下 instructions 2/2、skills 153/153 均带 `tokens`（如 `skills/archify=4116`），`providers.test.ts` 既有断言不受影响。
- [x] 列表与预览显示 token 胶囊
  - 验证：`client/entry-row.tsx`、`client/preview-pane.tsx` 在状态胶囊后渲染 `TokenBadge`（外壳与 `StatusBadge` 同款，中性配色）；`design-tokens.test.ts` 无裸数值违规。
- [x] 文案与文档
  - 验证：`shared/i18n.ts` 增加 `formatTokenCount` / `tokens` / `tokensHint`（中英双语）；`README.md` 说明估算口径、Plugins 递归范围与 MCP 不统计；`CHANGELOG.md` 增加 Unreleased 条目。
- [x] typecheck / tests / reload
  - 验证：`npm run typecheck` 通过；`npm test` 64 项通过；`paseo plugin reload customize` 后 `paseo plugin ls` 为 running，`paseo plugin logs customize` 无报错。
