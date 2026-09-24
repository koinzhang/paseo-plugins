# 010 · 其他主题的 popover 边框透明度

本规格更新 009 中「其他主题保留宿主颜色但不调整透明度」的行为。

## 目标

- Web / Electron 下开启 Hide dividers and borders 时，combobox 和 menu 桌面弹层继续使用 0.5px 边框。
- Mono 主题继续使用 Mono `border` 色的 50% 透明边框。
- 其他主题保留各弹层的宿主边框色，并将其透明度降为原来的 50%；combobox 使用宿主 `border`，menu 使用宿主 `borderAccent`。

## 实现

- CSS 不能直接引用元素被覆盖前的 `border-color`。Web 适配器暂时撤销自身的 chrome 标记，读取弹层的 computed `borderColor`，写入插件专用 CSS 变量，再用 `color-mix(in srgb, <原色> 50%, transparent)` 绘制边框。
- 重扫弹层时同步主题颜色变化；弹层消失、切到 Mono 主题、关闭开关或插件卸载时，恢复原有的内联 CSS 变量值。

## 非目标

- 移动端 bottom sheet、iOS / Android 原生弹层。
- 修改弹层圆角、阴影或背景。

## 验收

- `npm run typecheck`、`npm test` 通过。
- 切到非 Mono 主题后，combobox / menu 的 0.5px 边框沿用各自宿主颜色且透明度为 50%。
- 切换主题、关闭 Hide dividers and borders、卸载插件后无残留的插件内联样式。
