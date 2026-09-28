# 025 — Plan

- `shared/selection-settings.ts`：`board-selection` schema 增加 `layout: z.enum(["list", "card"]).default("list")`；`version` 保持 1（新增字段有默认值，旧文档可直接解析，无需 `migrate`）。`slash-command.ts` 已是「读 - 展开 - 写」，自动保留该字段。
- `shared/i18n.ts`：新增 `showCards` / `showList`（中英），用于按钮 tooltip 与无障碍标签。
- `client/design-tokens.ts`：新增 `GRID = { minCardWidth: 240, maxColumns: 3, gap: 12 }` 与 `CARD = { padding: 12 }`。
- `client/grid.ts`（新）：`gridColumns(width)` / `cardWidth(width, columns)` 纯函数，便于单测；宽度为 0（尚未测量）时返回 1 列 / `undefined`。
- `client/entry-row.tsx`：抽出 `entryLabel(entry, m)` 无障碍标签，列表行与卡片共用。
- `client/entry-card.tsx`（新）：卡片组件。外壳 `RADIUS.block` + `CARD.padding`，默认 `surface1` 底 + `border` 边，hover / pressed `surface2`，选中 `accent` 边框 + `surface2` 底；内容为「分类图标 + 名称 + 状态胶囊」、描述（2 行）、`entryMeta`（2 行）、token / Agent Plugins 胶囊行；宽度未测量时 `flexBasis: 100%` 兜底。
- `client/surface.tsx`：
  - 搜索框与切换按钮包进同一行容器（保持「搜索框右侧」，随工具栏一起换行）。
  - `IconButton` 图标按当前视图取 `LayoutGrid`（列表态）/ `List`（卡片态），label / tooltip 为 `showCards` / `showList`，点击经 `settings.save` 写回；`settings.saving` 时禁用，避免 revision 冲突。
  - ScrollView 内容包一层 View，用 `onLayout` 量内容宽度；按 `gridColumns` / `cardWidth` 计算卡片宽度；`source.entries` 在卡片视图渲染为 `flexDirection: "row"; flexWrap: "wrap"; gap: GRID.gap` 的网格。
- 测试：`client/grid.test.ts`（0 / 1 / 2 / 3 列边界与卡片宽度）、`client/selection-settings.test.ts`（`layout` 默认 `list`、接受 `card`、拒绝非法值）。
- 文档：README 功能说明、CHANGELOG Unreleased。
