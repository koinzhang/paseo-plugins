# 022 — Plan

- `client/surface.tsx`：外层保持可换行横向容器。右侧 section 去掉固定 `flexBasis: 220`，改为 `flexGrow: 1, flexShrink: 1, minWidth: 0`；Yoga 换行按 flex basis（auto → max-content）判定：两段放不下时右侧整体换到第二行，单独放不下时内部 `flexWrap` 再折行。搜索框容器补 `flexShrink: 1`，可在 `minWidth: 180` 范围内收缩。
- `client/ui.tsx` `CategoryTabs`：根节点补 `flexShrink: 1, minWidth: 0`。RN 默认 `flexShrink: 0`，否则 tab 超出容器宽度时不会收缩，内部 `flexWrap` 也不会生效，导致超出屏幕。`gap: 18` 拆为 `columnGap: 18, rowGap: 2`，折行时行距紧凑。
- 依据：Yoga `CalculateLayout.cpp` 中 flex basis auto 时按 MaxContent 测量，wrap 容器据此分行，因此上述设置能保证「先分两行、再段内折行」的优先级。
