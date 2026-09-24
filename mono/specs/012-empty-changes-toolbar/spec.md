# 012 · 收起 Changes 空仓库工具栏

## 问题

Explorer 的 Changes 面板有仓库工具栏和 Uncommitted 工具栏。Paseo 在当前分支名为空（例如 jj colocated checkout 的 detached HEAD）、没有 PR 且没有工具栏动作时，仍渲染 36px 高的仓库工具栏。隐藏分隔线后，这一行呈现为明显空白。

## 目标

- Web / Electron 开启 Hide dividers and borders 时，Explorer Changes 仓库工具栏若没有可见内容，则收起这一空行。
- 分支、PR 或动作出现时保留工具栏；关闭开关或卸载插件后恢复宿主布局。

## 非目标

- 不改 Paseo 宿主源码、Changes 数据或其他面板的工具栏。
- 不改变有内容的仓库工具栏、Uncommitted 工具栏及其操作。

## 验收

- `npm run typecheck`、`npm test` 通过，插件重载后状态为 `running`。
- 无分支 / PR / 动作时，Changes 标签下方直接显示 Uncommitted 工具栏；有内容时仓库工具栏仍可见。
