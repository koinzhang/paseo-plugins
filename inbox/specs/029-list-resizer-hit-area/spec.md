# 029 Restore global list resizing

## 问题

- 筛选菜单改造给非 compact 列表栏补上了 `flex: 1`，使列表继续占据剩余空间，不能按拖拽宽度分栏。
- 同一层又将原本 `listPane.overflow = hidden` 覆盖为 `visible`，扩大鼠标命中范围，可能盖住分隔线的 9px 拖拽区。

## 决策

1. 保留 `listPane` 的 `overflow: hidden`；移除 `listChrome` 的溢出覆盖。
2. `listChrome` 不再设置 `flex: 1`，沿用 compact 分支的 `flex: 1` 和非 compact 分支的 `width: listWidth`。
3. 保留筛选菜单在 toolbar 之后的高 zIndex 绝对定位、测量锚点与 backdrop，不改标题或行尾操作。
4. 沿用 9px resizer、window mousemove / mouseup 跟踪、280–640 clamp 和 rememberedListWidth。

## 验收

- 非 compact 列表宽度仅来自 listWidth，分隔线不受列表溢出命中影响。
- 筛选菜单仍在列表内容之上，不被 toolbar stacking context 覆盖。
- 完整离线检查、diff check 和 reload；不做界面测试。
