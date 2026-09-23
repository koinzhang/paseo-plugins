# 008 · 隐藏 composer / pill / popover 边框

## 目标

Web / Electron 下，选中 Mono Light 或 Mono Dark 时，隐藏以下元素的边框（只改颜色为透明，保留 1px 占位与背景、阴影）：

- Composer 输入框：`composer/input/input.tsx` 的 `styles.inputWrapper`（`message-input-root` 的直接子节点）
- Composer 上方的 pill：`composer/pill-styles.ts` 的 `composerPillStyles.body`（导入、diff stat、track、插件 composer pill 等）
- Popover：
  - Combobox 桌面弹层：`ui/combobox.tsx` 的 `styles.desktopContainer`（testID `combobox-desktop-container`，如模型选择器）
  - Menu 桌面弹层：`ui/menu/menu-overlay.tsx` 的 `styles.content`（dataSet `menuSurface` → `data-menu-surface="true"`）

## 定位

- Composer：CSS `[data-testid="message-input-root"] > *`
- Pill 没有共同 testID：在 `[role="button"]` 中按 computed style 签名匹配——`min-height: 32px`（`COMPOSER_PILL_MIN_HEIGHT`）、`border-top-width: 1px`、`border-top-left-radius: 16px`（`borderRadius["2xl"]`）；结果按元素 + `class` 缓存，class 变化时重测
- Popover：按上述 testID / data 属性直接匹配

## 行为

- Popover 规则对所有 combobox / menu 桌面弹层生效，不限于 pill 触发的弹层（弹层由 portal 渲染，无法可靠关联触发源）
- 切换非 Mono 主题或停用插件后恢复

## 非目标

- 移动端 bottom sheet
- iOS / Android

## 风险

- 宿主调整 pill 尺寸 / 圆角后签名失效，表现为 pill 边框重新出现
- 其他恰好满足签名的按钮也会失去边框

## 验收

- `npm run typecheck`、`npm test` 通过
- `paseo plugin reload mono` 后状态为 `running`
- Mono 主题下 composer、composer 上方 pill、模型选择器等弹层无边框
