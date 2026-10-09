# 019 · 无 context 数据时隐藏 context 圆环

## 问题

Composer 右下角的 context 圆环在没有 token 数据时仍然占位。悬停详情写着 “No context data”（`contextWindow.noData`）。

## 目标

- Web / Electron 下，**Composer → Hide empty context meter** 默认开启。
- 圆环没有进度圈（`usedTokens` / `maxTokens` 无效，详情为 No context data）时，隐藏圆环和它外面的 28px 占位。
- 已有 token 数据时圆环保留，包括 0%。
- 关闭开关或卸载插件后恢复。
- 不隐藏同一行的语音、发送等按钮。

## 非目标

- 不改 Paseo 宿主，不禁用 context 详情或 Usage。
- iOS / Android。

## 验收

- `npm run typecheck`、`npm test` 通过，插件重载后状态为 `running`。
- 无 context 数据时右下角没有圆环；出现 token 数据后圆环回来。
- 关闭 Hide empty context meter 后，空圆环恢复。
