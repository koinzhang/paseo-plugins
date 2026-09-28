# 026 — Plan

- `client/surface.tsx`：固定操作栏容器在 `paddingTop` 之外增加 `paddingBottom: titleGap(compact)`。操作栏与 ScrollView 是兄弟节点，该内边距把滚动视口整体下移，滚动中的内容在视口顶部被裁掉时仍与操作栏保持间距。
- ScrollView 的 `contentContainerStyle.paddingTop` 保持 `page.gap` 不变，静止时首节标题到操作栏的间距由 `page.gap` 增加到 `page.gap + titleGap(compact)`。
