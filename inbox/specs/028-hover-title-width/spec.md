# 028 Hover-aware row title width

## 需求

- 桌面列表未 hover 时，标题使用操作按钮所占的整行宽度，单行超长仍以省略号缩略。
- hover 或操作进行中时，标题在操作按钮之前缩略，不被覆盖。
- 移动端固定显示按钮，保持原布局。

## 决策

1. 桌面操作组绝对定位到标题行右侧，不再以透明元素占据正常文档流。
2. 操作组用 `onLayout` 测量真实宽度；隐藏时标题 paddingRight 为 0，显示时增加按钮宽度及与 `row.gap` 相同的 8px 间距。
3. 标题与图标、权限 badge 保持现有布局；副标题不参与操作组覆盖。
4. 沿用普通 View 的 pointer enter / leave 和独立 Pressable，不改变 hover 状态机或按钮 disabled 逻辑。
5. 移动端操作组仍在正常文档流中，不测量、不改变 padding。

## 验收

- 桌面未 hover 的标题可用宽度等于图标之后至行尾的完整空间。
- hover / busy 后标题 paddingRight 等于操作组实际宽度 + 8，仍单行省略。
- 移动端固定显示、业务操作和按钮 hover 稳定性不变。
- 完整离线检查、diff check、reload；不做界面测试。
