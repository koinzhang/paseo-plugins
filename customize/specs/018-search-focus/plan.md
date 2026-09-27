# 018 — Plan

- `client/surface.tsx` 为搜索框增加本地焦点状态，`TextInput` 的 `onFocus` / `onBlur` 更新该状态。
- Web 输入元素关闭默认 outline；搜索框容器在聚焦时使用主题 `foregroundMuted` 边框，避免双层焦点框。
