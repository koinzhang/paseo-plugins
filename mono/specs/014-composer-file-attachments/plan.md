# 014 · Plan

宿主 `composer/index.tsx` 给上传文件和 Workspace 文件附件分别设置 `composer-file-attachment-pill`、`composer-workspace-file-attachment-pill` testID。`AttachmentLabel` 的标题是文件名，副标题对 Workspace 文件是完整相对路径。Files 树使用扩展名选择 Material 图标，而 Composer 当前统一使用 `FileText`。

Mono 只处理这两个带 testID 的附件。适配器读取标题和副标题，设置类型图标及缩略路径属性；CSS 收起副标题，并在悬停或点击固定状态时把标题替换为缩略路径。完整路径留在 `title`。类型图标使用文件扩展名分类的小型标记，不依赖宿主内部模块。监听器和自有属性在卸载时清理。

`display` 设置文档新增默认值为 `true` 的 `enhancedFileAttachments`。设置页在 Composer 分组渲染开关。Web 适配器每次 reconcile 读取设置：开启时标记附件并同步图标颜色，关闭时撤销这些属性、内联颜色与点击固定状态。现有设置读写和订阅会在保存后触发 reconcile。

宿主 `AttachmentLabel` 的 `labelTitle` 使用 `theme.fontSize.base`（当前 14px）。路径伪元素沿用同样的 14px。相对路径与标题完全相同时不设置路径替换属性，悬停仍能通过 `title` 查看完整内容。
