# 024 — 配置条目 Token 估算

## 目标

- 为 **Instructions / Rules / Skills / Commands / Subagents / Plugins** 六类条目估算 token 数，显示在列表行名称与状态胶囊之后，样式沿用 Skills 的 Auto / Manual 胶囊。
- 估算算法用**分脚本启发式**：`ceil(asciiBytes / 4 + cjkChars / 1.5 + otherNonAsciiBytes / 3)`。零依赖、不联网、不引入分词器。
- 统计的是**条目自身内容规模**（极端上限：整份文件都进上下文），不区分 skills / commands / subagents 的按需加载形态。
- Plugins **递归**统计包内组件目录（`skills` / `commands` / `agents` / `rules` / `instructions`）下的提示词文件（`.md` / `.markdown` / `.mdc` / `.rules` / `.txt`）；不统计 manifest、代码与打包产物。
- **MCP 不统计**，行内不显示胶囊。
- 估算在服务端扫描阶段完成，结果写入 `Entry.tokens`，随扫描快照一起持久化。

## 非目标

- 不接真实 tokenizer（tiktoken / BPE）或 provider token 计数 API。
- 不统计 MCP server 的 `tools/list` 工具清单。
- 不做分类合计、上下文预算条，也不与活体会话的 `contextWindowUsedTokens` 对比。
- 不改动既有 `status` / `reason` 判定、扫描位置与预览行为。

## 验收

- 六类条目在列表中显示 `≈1.2k tok` 样式的胶囊，位置在状态胶囊之后、Agent Plugins 标记之前；MCP 行不显示。
- 同一文件重复统计命中缓存（key = path + mtime + size），插件目录下 `node_modules` / `dist` / `build` / 隐藏目录不参与统计。
- 空文件、目录型插件但无组件、以及非 manifest 的插件条目（如 Goose `config.yaml`、Cline `.js`）不显示胶囊。
- 旧快照（无 `tokens` 字段）仍可读取，缺失时不显示胶囊。
- `npm run typecheck`、`npm test` 通过，插件 reload 后 running。
