# 022 — 工具栏两段式响应换行

## 目标

- 分类工具栏分成两个 section：左侧为配置分类切换（Instructions / Rules / Skills / MCP / Subagents / Plugins），右侧为 how it loads + Skills 调用方式筛选 + 搜索框。
- 空间不足时优先把两个 section 拆成两行：左侧在第一行，右侧整体到第二行；不先压缩 section 内部。
- 再窄时 section 内部换行：分类 tab 逐行折行；右侧控件按既有顺序折行，搜索框可收缩到最小宽度。
- 保持控件顺序、搜索 / 筛选 / 计数 / 预览行为不变，窄屏下所有控件都在可视区域内可点击。

## 非目标

- 不改顶部 Provider / Project / 版本控制行。
- 不改变右侧 section 内部控件顺序（Skills 筛选 → how it loads → 搜索）。

## 验收

- 宽屏下两个 section 同行，右侧控件靠右对齐。
- 中等宽度下右侧 section 整体换到第二行，分类 tab 不被压缩。
- 窄屏下分类 tab 折成多行；右侧控件在第二行内折行且不超出屏幕。
- `npm run typecheck`、`npm test` 通过，插件 reload 后 running。
