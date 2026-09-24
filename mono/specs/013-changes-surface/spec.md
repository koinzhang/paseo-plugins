# 013 · Changes 与 Explorer 底色一致

## 目标

- Mono 插件加载时，Explorer Changes 的仓库工具栏和比较工具栏透出 Explorer 的 `surfaceSidebar` 背景，不出现独立的 `surface0` 色块；当前应用主题不影响这一布局修正。
- 隐藏 Changes 中的 “Set up … on this host to use its features.” 设置提示。
- 分支切换、比较模式、刷新及其他 Changes 操作继续可用。

## 非目标

- 不修改 Paseo 宿主源码或 Explorer 之外的界面。
- 不隐藏其他面板、其他提示或 git/PR 功能本身。

## 验收

- `npm run typecheck`、`npm test` 通过，插件重载后状态为 `running`。
- Changes 工具栏与 Explorer 底色一致；有分支时分支仍可见，无分支时空工具栏仍收起。
- git host 设置提示不显示，其他 Changes 内容正常。
