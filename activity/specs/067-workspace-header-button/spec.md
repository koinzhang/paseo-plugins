# 067 — Workspace header button

## 1. 背景

Workspace Activity（Explorer 面板 `workspace-activity`）目前只能通过 ⌘K「Workspace Activity」或手动在 Explorer 添加打开（025 G9），入口不够直接。

## 2. 目标

- 每个 workspace 的 header 右侧增加一个 Activity 图标按钮，点击在 Explorer 打开 `workspace-activity`
- 按钮标题 / a11y 文案随 app 语言（复用 `commands.workspaceActivity`）
- 该 workspace 的 Activity 面板可见时隐藏按钮，不可见（未打开 / 被切走 / Explorer 收起）时显示

## 3. 非目标

- 不改宿主已有按钮，不控制按钮位置与 overflow（宿主决定）
- 不在按钮上显示计数 / 状态

## 4. 验收

- 打开任一 workspace，header 右侧出现 Activity 图标按钮；hover 提示「Workspace Activity」/「工作区 Activity」
- 点击后 Explorer 打开当前 workspace 的 Activity 面板，按钮随即隐藏
- 切到 Explorer 其他 tab、关闭面板或收起 Explorer 后按钮重新出现
- 新建 workspace 后按钮出现；归档后注册被移除
- 切换 app 语言后提示文案更新
- `paseo plugin reload activity` 后无重复按钮
