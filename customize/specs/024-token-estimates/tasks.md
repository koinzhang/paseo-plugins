# 024 — Tasks

- [x] `Entry.tokens` 契约字段
  - 验证：`shared/contracts.ts` 增加可选 `tokens`；`npm test` 中快照/预览用例通过，旧快照缺字段仍可读。
- [x] `server/tokens.ts` 估算器与插件递归
  - 验证：`server/tokens.test.ts` 7 项全过（ASCII 400 字符 = 100、15 个汉字 = 16、空串 = 0；插件组件目录求和、`node_modules` 与 `.js` 不计入；MCP、非 manifest 插件与空插件返回 `undefined`）。
- [x] CJK 系数校准（GPT `o200k_base`）
  - 验证：`gpt-tokenizer` 实测用户 3 份中文 `AGENTS.md`（3285 / 1485 / 2757）旧公式为 0.77–0.81、新公式 1.02 / 0.97 / 1.03；2168 份本地文件 MAPE 19.5% → 10.0%，含 CJK 文件 22.6% → 9.7%（p50 0.76 → 0.95）；纯 ASCII 文件不变（11.7%）。
- [x] 扫描接入
  - 验证：`scanProvider` 返回 `withTokens(...)`；真实扫描 `pi` provider 下 instructions 2/2、skills 153/153 均带 `tokens`（如 `skills/archify=4116`），`providers.test.ts` 既有断言不受影响。
- [x] 列表与预览显示 token 胶囊
  - 验证：`client/entry-row.tsx`、`client/preview-pane.tsx` 在状态胶囊后渲染 `TokenBadge`（外壳与 `StatusBadge` 同款，中性配色）；`design-tokens.test.ts` 无裸数值违规。
- [x] 文案与文档
  - 验证：`shared/i18n.ts` 增加 `formatTokenCount` / `tokens` / `tokensHint`（中英双语）；`README.md` 说明估算口径、Plugins 递归范围与 MCP 不统计；`CHANGELOG.md` 增加 Unreleased 条目。
- [x] 常驻 / 调用时双口径
  - 验证：`server/tokens.test.ts` 新增 5 项（on-demand 拆分、commands/subagents 拆分、插件组件拆分、disabled/inactive/manual 分支、两段之和等于全文）；真实扫描 `pi` provider 下 `instructions/AGENTS.md = ≈849`（单段）、`skills/paseo-plugin = ≈144 +7984 on invoke`（双段）、manual skill 只出 `+4116 on invoke`。
- [x] 快照版本与客户端双胶囊
  - 验证：`SNAPSHOT_VERSION` 4 → 5（`scan-snapshot.test.ts` 同步）；`client/entry-row.tsx` / `client/preview-pane.tsx` 为 0 的段不渲染；`design-tokens.test.ts` 无裸数值违规。
- [x] typecheck / tests / reload
  - 验证：`npm run typecheck` 通过；`npm test` 67 项通过；`paseo plugin reload customize` 后 `paseo plugin ls` 为 running，`paseo plugin logs customize` 无报错。
