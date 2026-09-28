# 025 — Tasks

- [x] `layout` 设置字段
  - 验证：`shared/selection-settings.ts` 增加 `layout` 默认 `list`；`client/selection-settings.test.ts` 覆盖默认 / `card` / 非法值，`client/slash-command.test.ts` 覆盖旧文档补默认与已有 `card` 值保留。
- [x] 网格纯函数与 token
  - 验证：`client/grid.ts`（`GRID` + `gridColumns` / `cardWidth`，不依赖 React Native，供 Node 测试导入），`client/design-tokens.ts` 转发 `GRID` 并新增 `CARD`；`client/grid.test.ts` 覆盖 0 / 491 / 492 / 743 / 744 / 1600 宽度与卡片宽度。
- [x] 卡片组件与共用无障碍标签
  - 验证：`client/entry-card.tsx` 展示名称 / 状态 / 描述（2 行）/ meta（2 行）/ token / Agent Plugins；`client/entry-row.tsx` 抽出 `entryLabel` 并被两者复用；`design-tokens.test.ts` 无裸数值违规。
- [x] 搜索框右侧切换按钮
  - 验证：`client/surface.tsx` 搜索框右侧 `IconButton`（列表态 `LayoutGrid`、卡片态 `List`），tooltip / label 为中英 `showCards` / `showList`，点击写回 settings；`npm run typecheck` 通过。
- [x] 网格渲染与响应式
  - 验证：`client/surface.tsx` 内容包一层 `onLayout` 量宽，卡片视图按 `gridColumns` 渲染 1–3 列，选中态 / 预览回调与列表共用；`npm test` 70 项全过。页面目视验收待完成（列数变化、卡片等高、预览联动）。
- [x] 文案与文档
  - 验证：`shared/i18n.ts` 中英 `showCards` / `showList`；`README.md`、`CHANGELOG.md`、`specs/README.md` 更新。
- [x] typecheck / tests / reload
  - 验证：`npm run typecheck` 通过；`npm test` 70 项通过；`paseo plugin reload customize` 后 `paseo plugin ls` 为 running，`paseo plugin logs customize` 无报错。
