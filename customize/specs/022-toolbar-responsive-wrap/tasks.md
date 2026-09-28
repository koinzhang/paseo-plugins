# 022 — Tasks

- [x] 右侧 section 改为内容宽度判定换行
  - 验证：源码核对 `surface.tsx` 右侧容器为 `flexGrow: 1, flexShrink: 1, minWidth: 0`、无固定 `flexBasis`；搜索框 `flexShrink: 1` 且保留 `minWidth: 180`。
- [x] CategoryTabs 可收缩并在段内折行
  - 验证：源码核对 `ui.tsx` 根节点 `flexShrink: 1, minWidth: 0, flexWrap: "wrap"`，`columnGap: 18, rowGap: 2`。
- [x] Yoga 布局模拟验证换行优先级
  - 验证：`yoga-layout@3` 复刻结构（tabs 447 / 右段 556 / 外层 gap 8），1100 同行、900/600 右段整体到第二行且左段保持 447 不压缩、400/300 左段收缩并折行、右段内部再折行。
- [x] typecheck / tests / reload
  - 验证：`npm run typecheck`、`npm test`（57 项）通过；`paseo plugin reload customize` 后 `paseo plugin ls` 为 running。
