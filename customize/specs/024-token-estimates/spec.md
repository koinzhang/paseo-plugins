# 024 — 配置条目 Token 估算

## 目标

- 为 **Instructions / Rules / Skills / Commands / Subagents / Plugins** 六类条目估算 token 数，显示在列表行名称与状态胶囊之后，样式沿用 Skills 的 Auto / Manual 胶囊。
- 区分**常驻**与**调用时**两个口径：
  - Instructions / Rules 全程常驻 → 单个胶囊 `≈1.2k tok`。
  - Skills / Commands / Subagents 渐进披露：常驻只有 name + description，正文在被调用时才加载 → 双胶囊 `≈114 tok` + `+1.2k on invoke`。
  - Plugins 按组件求和：`skills` / `commands` / `agents` 组件按上面同样拆分，`rules` / `instructions` 及其他组件算常驻。
  - 状态为 `disabled` / `inactive` 的条目不显示胶囊（不加载）；`manual` 只显示 `+N on invoke`（不被广告给模型）。
- 估算算法用**分脚本启发式**：`ceil(ascii / 4 + cjkChars * 1.05 + otherNonAsciiBytes / 3)`。零依赖、不联网、不引入分词器。
  - 校准目标为 GPT 的 `o200k_base`。用户提供的 3 份中文 `AGENTS.md` 实测 3285 / 1485 / 2757，旧系数（CJK 1.5 字符/token）只算出 0.77–0.81，新系数为 1.02 / 0.97 / 1.03。
  - 2168 份本地 markdown / 代码 / 配置（含 1594 份含 CJK 文件）上 MAPE 由 19.5% 降到 10.0%；含 CJK 文件由 22.6% 降到 9.7%，p50 由 0.76 升到 0.95。纯 ASCII 内容不受影响。
  - Claude 系分词器在 CJK 上还要再密 10–20%，本估算不加这部分。
- Plugins **递归**统计包内组件目录（`skills` / `commands` / `agents` / `rules` / `instructions`）下的提示词文件（`.md` / `.markdown` / `.mdc` / `.rules` / `.txt`）；不统计 manifest、代码与打包产物。
- **MCP 不统计**，行内不显示胶囊。
- 估算在服务端扫描阶段完成，结果写入 `Entry.tokens`，随扫描快照一起持久化。

## 非目标

- 不接真实 tokenizer（tiktoken / BPE）或 provider token 计数 API。
- 不统计 MCP server 的 `tools/list` 工具清单。
- 不做分类合计、上下文预算条，也不与活体会话的 `contextWindowUsedTokens` 对比。
- 不改动既有 `status` / `reason` 判定、扫描位置与预览行为。

## 验收

- 六类条目在列表中显示 token 胶囊，位置在状态胶囊之后、Agent Plugins 标记之前；MCP 行不显示。
- Instructions / Rules 只显示一个 `≈N tok`；auto / conditional 的 Skills / Commands / Subagents 显示 `≈N tok` + `+M on invoke`，且两段之和等于文件全文；manual 条目只显示 `+M on invoke`；disabled / inactive 不显示。
- 插件行同样拆两段：`skills/<name>/SKILL.md`、`commands/**`、`agents/**` 只把 name + description 计入常驻，其正文与 `skills/**/references/**` 等附属文件计入调用时；`rules` / `instructions` 全文计入常驻。
- 同一文件重复统计命中缓存（key = path + mtime + size），插件目录下 `node_modules` / `dist` / `build` / 隐藏目录不参与统计。
- 空文件、目录型插件但无组件、以及非 manifest 的插件条目（如 Goose `config.yaml`、Cline `.js`）不显示胶囊。
- 旧快照（`tokens` 还是数字或缺失）被当作不兼容丢弃并重扫，`SNAPSHOT_VERSION` 升到 5。
- `npm run typecheck`、`npm test` 通过，插件 reload 后 running。
