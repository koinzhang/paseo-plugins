# 021 — Plan

- `client/provider-options.ts`：`ProviderMenuOption` 增加 `group: "builtin" | "acp"`，沿用现有 `source` / `BUILTIN_IDS` 判定（`source=custom` 或旧快照缺 source 且非内置 ID 视为 ACP）。收集后按「组序（builtin → acp）→ label（`localeCompare`，`sensitivity: "base"`）」排序，输出顺序即下拉渲染顺序；badge 与回退逻辑不变。
- `client/dropdown.tsx`：`DropdownOption` 增加可选 `group`；渲染时若当前选项 group 与上一项不同，则在两者之间插入分割线（`height: 1`、`colors.border`、上下与左右留间距）。无 `group` 的列表（Project）不渲染分割线。选中项的对号移到 badge 之前，保持 badge 右对齐；图标用宿主菜单同款 `Check`（`lucide-react-native`），未选中不占位。
- 更新 `client/provider-options.test.ts` 期望顺序与 group 字段；分割线属渲染细节，由 typecheck + reload 目视验证。
