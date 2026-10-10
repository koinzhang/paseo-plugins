# 020 · Plan

1. 在 `client/model-visibility-web.ts` 的已有样式内，以 Provider dialog 下直接包含 Mono 开关的行作为 CSS 范围，不添加宿主 DOM 包裹层。
2. 行作为定位容器，右内边距预留宿主边距 16px + 开关 34px + 行间距 12px；开关绝对定位到右侧 16px，垂直居中。
3. 行内文字覆盖宿主 `flexShrink: 0`，允许缩小并显示省略号；删除按钮禁止缩小。
4. 使用现有 Chromium 回归脚本验证适配器的重排、点击归属与清理；重载后在实际 Claude 长模型列表检查右侧对齐、文字省略与开关边界。

布局只随适配器样式生效。移除开关或卸载 style 后，`:has()` 不再匹配，无需保存和恢复宿主 inline style。
