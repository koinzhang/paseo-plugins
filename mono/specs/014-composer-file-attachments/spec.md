# 014 · Composer 文件附件

## 目标

- Web Composer 的文件附件默认只显示类型图标和文件名。
- Workspace 文件附件悬停或点击时显示路径；路径较长时省略中间部分，保留开头与文件名。完整路径通过原生悬停提示保留。
- 文件名与悬停路径使用相同字号；相对路径等于文件名时，悬停不替换文字。
- 文件图标随文件类型变化，与 Files 树的类型识别保持一致；普通上传文件也显示类型图标。
- 新类型标记使用宿主附件的次要文字灰色，原有通用文件图标完全隐藏。
- Settings → Plugins → mono → Settings 的 **Composer** 分组增加“Optimize file attachments”开关，默认开启；关闭后立即恢复宿主文件附件样式，其他 Composer 设置不受影响。
- 删除附件、拖放和 Add to chat 的行为保持不变。

## 范围

- 仅 Mono 的 Web DOM 适配层；不修改 Paseo 宿主或移动端。

## 验收

- `npm run typecheck` 与 `npm test` 通过。
- 在 Web Composer 检查 Markdown、配置、代码等类型及长路径；卸载插件后还原宿主样式。
- 开关关闭后恢复原图标、文件名与副标题；再次开启后恢复优化样式，设置在重载后保持。
