# 024 — Plan

- `shared/contracts.ts`：`EntrySchema` 增加可选 `tokens: { atRest, onInvoke }`（`TokenCost`），旧快照的 `tokens: number` 校验失败 → 丢弃重扫。
- `server/tokens.ts`（新）：
  - `estimateTokens(text)`：逐码点分类。ASCII（≤ U+007F）按 1/4 token；CJK / 假名 / 谚文 / 全角 / CJK 标点（含 U+2E80–U+303F、U+3040–U+30FF、U+3130–U+318F、U+3400–U+4DBF、U+4E00–U+9FFF、U+A960–U+A97F、U+AC00–U+D7AF、U+F900–U+FAFF、U+FF00–U+FFEF、U+20000+）按 1.05 token/字符；其余非 ASCII 按 UTF-8 字节数 / 3。结果 `Math.ceil`。
    - 系数来源：用 `gpt-tokenizer` 的 `o200k_base` 在 2168 份本地文件上做非负最小二乘拟合，再用 3 份中文 `AGENTS.md`（3285 / 1485 / 2757）做锚点验证。CJK 旧值 1.5 字符/token 是系统性低估的主因（纯 ASCII 文件不受影响）。
  - `fileTokens(file)`：`statSync` 取 mtime+size 作为缓存 key，`readText` 上限 4 MiB，命中直接返回。
  - `pluginRoot(file)`：目录 → 自身；`*.json` → 父目录（父目录形如 `.xxx-plugin` 时再上一层）；其他（`config.yaml`、`.js`）→ `undefined`。
  - `pluginTokens(root)`：只遍历组件目录，深度 ≤ 6、文件数 ≤ 500，跳过 `node_modules` / `dist` / `build` / `out` / `coverage` / `vendor` / `target` / `__pycache__` 与隐藏目录。`skills` / `commands` / `agents` 组件里，`SKILL.md` 或命令 / 代理文件只把 name + description（frontmatter 优先，否则首行）计入 `atRest`，其余内容（含 `skills/**/references/**`）计入 `onInvoke`；`rules` / `instructions` 及其他组件全文计入 `atRest`。
  - `entryTokens(entry)`：MCP 与 `disabled` / `inactive` → `undefined`；Instructions / Rules → `{ atRest: 全文, onInvoke: 0 }`；Skills / Commands / Subagents → `manual` 为 `{ atRest: 0, onInvoke: 全文 }`，否则 `{ atRest: min(name+description, 全文), onInvoke: 余下 }`；Plugins 走 `pluginTokens`。两段之和始终等于文件全文。
  - `withTokens(entries)`：给每个有成本的条目挂上 `tokens`，两段都为 0 时不写字段。
- `server/scan-snapshot.ts`：`SNAPSHOT_VERSION` 4 → 5，旧结构（`tokens: number`）直接丢弃重扫。
- `server/handlers.ts`：`scanProvider` 返回值改为 `withTokens(mergeSkillAliases(...))`，扫描快照自动带上 `tokens`。tokens 模块只依赖 `scan-kit`，不反向引用，避免循环依赖。
- `shared/i18n.ts`：`formatTokenCount(n)`（<1k 原值、<10k 一位小数 k、<1M 整数 k、≥1M 一位小数 M）与 `tokens(value)` / `tokensOnInvoke(value)` / `tokensHint(value)` / `tokensOnInvokeHint(value)` 双语文案。
- `client/ui.tsx`：新增 `TokenBadge`，外壳与 `StatusBadge` 一致（`CONTROL.pillBadgeHeight` + `pillRadius` + `TEXT.pillBadge`），配色用中性 `border` / `foregroundMuted`，避免与状态色竞争。
- `client/entry-row.tsx` / `client/preview-pane.tsx`：在状态胶囊之后依次渲染 `atRest` / `onInvoke` 胶囊（为 0 的不渲染）；行无障碍标签追加两段文案。
- 测试：`server/tokens.test.ts` 覆盖估算公式（ASCII / CJK / 其他多字节 / 空串）、两段拆分（auto 与 manual、两段之和等于全文）、插件递归与组件分类、MCP / disabled / inactive 跳过、非 manifest 插件条目跳过。
