# 024 — Plan

- `shared/contracts.ts`：`EntrySchema` 增加可选 `tokens: z.number()`（`Entry.tokens`），旧快照缺字段仍通过校验。
- `server/tokens.ts`（新）：
  - `estimateTokens(text)`：逐码点分类。ASCII（≤ U+007F）按 1/4 token；CJK / 假名 / 谚文 / 全角 / CJK 标点（含 U+2E80–U+303F、U+3040–U+30FF、U+3130–U+318F、U+3400–U+4DBF、U+4E00–U+9FFF、U+A960–U+A97F、U+AC00–U+D7AF、U+F900–U+FAFF、U+FF00–U+FFEF、U+20000+）按 1.5 字符/token；其余非 ASCII 按 UTF-8 字节数 / 3。结果 `Math.ceil`。
  - `fileTokens(file)`：`statSync` 取 mtime+size 作为缓存 key，`readText` 上限 4 MiB，命中直接返回。
  - `pluginRoot(file)`：目录 → 自身；`*.json` → 父目录（父目录形如 `.xxx-plugin` 时再上一层）；其他（`config.yaml`、`.js`）→ `undefined`。
  - `pluginTokens(root)`：只遍历组件目录，深度 ≤ 6、文件数 ≤ 500，跳过 `node_modules` / `dist` / `build` / `out` / `coverage` / `vendor` / `target` / `__pycache__` 与隐藏目录。
  - `withTokens(entries)`：MCP 跳过；Plugins 走 `pluginTokens`；其余按文件统计。0 与 `undefined` 都不写字段。
- `server/handlers.ts`：`scanProvider` 返回值改为 `withTokens(mergeSkillAliases(...))`，扫描快照自动带上 `tokens`。tokens 模块只依赖 `scan-kit`，不反向引用，避免循环依赖。
- `shared/i18n.ts`：`formatTokenCount(n)`（<1k 原值、<10k 一位小数 k、<1M 整数 k、≥1M 一位小数 M）与 `tokens(value)` / `tokensHint(value)` 双语文案。
- `client/ui.tsx`：新增 `TokenBadge`，外壳与 `StatusBadge` 一致（`CONTROL.pillBadgeHeight` + `pillRadius` + `TEXT.pillBadge`），配色用中性 `border` / `foregroundMuted`，避免与状态色竞争。
- `client/entry-row.tsx` / `client/preview-pane.tsx`：在状态胶囊之后渲染 `TokenBadge`；行无障碍标签追加 token 文案。
- 测试：`server/tokens.test.ts` 覆盖估算公式（ASCII / CJK / 其他多字节 / 空串）、插件递归（组件目录计入、`node_modules` 与 `.js` 不计入）、MCP 跳过、非 manifest 插件条目跳过。
