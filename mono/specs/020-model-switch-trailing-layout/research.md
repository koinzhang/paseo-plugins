# 020 · Research

- 上游源码 commit：`718ed932b7843cde0b156ff30ec6adf42e828a18`；已安装运行时 `paseo --version`：`0.11.2`。
- `packages/app/src/components/provider-diagnostic-sheet.tsx`：DiscoveredModelRow 直接包含名称、带 `data-pmono` 的 ID 和可选说明；CustomModelRow 直接包含名称、ID、filler 和删除按钮。
- `sheetStyles.modelRow` 使用横向 flex、16px 水平内边距、12px gap；`modelTitle` 与 `monoHint` 的 `flexShrink: 0` 会使追加的 Mono 开关随文字溢出。
- 删除按钮尺寸 28×28。现有开关轨道尺寸 34×20，原 `position: relative` / `margin-left: auto` 仍参与 flex 排版。
