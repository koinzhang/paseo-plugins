# 027 — 刷新图标尺寸

## 目标

- Customize 工具栏右上角的重新扫描（RefreshCw）图标从 `ICON_SIZE.action`（16）改为 `ICON_SIZE.inline`（14），与搜索、清空、机制说明、下拉箭头等工具栏图标一致。

## 非目标

- 不改刷新行为、tooltip（上次扫描时间）与禁用 / busy 逻辑。
- 不改「无可用 Provider」空状态里的刷新按钮（独立主操作，保持 16）。

## 验收

- 工具栏刷新图标与相邻的搜索 / 箭头 / 机制图标视觉同高（14）。
- 刷新时 busy 指示器仍显示；tooltip 与点击行为不变。
- `npm run typecheck`、`npm test` 通过。
