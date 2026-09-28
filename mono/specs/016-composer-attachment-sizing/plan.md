# 016 · Plan

在 `syncFilePills` 中定位附件所属的 `message-input-root`，读取 `[data-composer-input]`（旧版可回退 textarea）或 `composer-readonly-content` 的 computed font size，保存为附件上的 `--mono-file-font-size`。按元素保存原始变量，关闭开关、附件移除或卸载时还原。

标题和路径伪元素共用该变量；类型标记宽高也使用该变量，标记内部文字为尺寸的一半。无输入元素时使用原附件 14px 字号。沿用现有 MutationObserver 与定时 reconcile 同步主题 / 样式变化。
