# 023 Stable desktop row hover

## 问题

根因是 `Pressable` 里嵌套了图标 `Pressable`，外层却用 `onHoverIn / onHoverOut` 驱动其他元素的显隐。内层 Pressable 的 hover 状态机与外层竞争，使鼠标移向按钮时外层 hover 退出。仅去掉 disabled 联动不足，需同时换掉 hover 跟踪方式。

## 修复

1. 采用 Paseo `docs/hover.md` 的标准结构：普通 `View` 使用 `onPointerEnter / onPointerLeave`，内部独立 `Pressable` 只处理行点击，绝不设置 `onHoverIn / onHoverOut`。
2. 业务禁用状态不随 hover 变化。后续 028 根据用户新需求将桌面操作组移出正常布局，标题只在显示操作时缩略。
3. Web 上隐藏时仅对操作组的图标与分隔线设置 `opacity: 0` 和 `pointerEvents: none`；显示 / busy 时正常交互。
4. 保留移动端固定显示、Web hover 显示；桌面标题宽度按 028 随操作显隐调整。

## 验收

- 外层 hover 是普通 View 的非冒泡 pointer 事件，行点击在内部 Pressable；`RowIconButton.disabled` 只使用业务状态，操作组的 opacity / pointerEvents 统一显隐。
- 行尾按钮在鼠标移到其上时保持显示和可点击，不因 hover 重算 disabled 或改变布局；实际桌面 hover 留用户验证。
- typecheck、完整测试、diff check 和 reload；不做界面测试，实际 hover 由用户确认。

## 源码依据

- `../paseo/docs/hover.md`：禁止在包含其他 Pressable 的 Pressable 上通过 `onHoverIn / onHoverOut` 驱动显隐。
- `../paseo/packages/app/src/components/sidebar-workspace-list.tsx:986`：普通 View 跟踪 pointer，内部 Pressable 处理 press。
