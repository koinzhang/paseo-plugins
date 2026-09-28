# 021 — Tasks

- [x] provider-options 分组与名称排序
  - 验证：`provider-options.test.ts` 覆盖 Built-in 在 ACP 之前、组内按名称排序（含大小写不敏感）、group 字段、旧快照缺 source 与去重行为不变；57 项测试全部通过。
- [x] Dropdown 组间分割线
  - 验证：源码核对相邻 group 变化处插入 `height: 1` / `colors.border` 分割线，带 `marginVertical: 4`（上下间距）与 `marginHorizontal: 4`；Project 选项无 group 不渲染分割线。
- [x] typecheck / tests / reload
  - 验证：`npm run typecheck` 通过；`npm test` 57 项通过；`paseo plugin reload customize` 后 `paseo plugin ls` 为 running。
