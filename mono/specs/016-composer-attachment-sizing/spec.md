# 016 · Composer 附件字号

## 目标

- 开启 Optimize file attachments 时，文件附件名称与悬停 / 点击显示的路径字号与所在 Composer 的输入文字一致。
- 文件类型标记由固定 18px 缩小至输入字号对应的尺寸，内部文字按比例缩放。
- 输入字号或主题变化后同步更新；关闭优化开关或卸载插件后恢复宿主样式。

## 范围

仅 Mono 现有 Web / Desktop 文件附件适配层，沿用现有开关、类型识别、路径展示和附件操作。

## 验收

- 上传文件与 Workspace 文件的标题、路径均跟随各自 Composer 的字号。
- 类型标记尺寸与输入字号一致，小于原来的 18px；保持次要文字颜色。
- `npm run typecheck`、`npm test` 通过，重载后 Mono 为 running。
