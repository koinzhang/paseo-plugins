# 001 · Mono 极简主题

## 目标

- 提供一对冷色纸感主题：`mono-dark`（Mono Dark）与 `mono-light`（Mono Light），出现在 Settings → Appearance
- 浅色为冷灰纸底 + 墨色字，深色为锌灰炭底；色相满足 B ≥ G ≥ R，chroma 很小，不是纯 R=G=B
- 无彩色强调：`accent` 与 `foreground` 同值，按钮、选中、焦点都是墨色
- 纯数据插件：只有 `index.client.ts` 调 `client.addTheme`，无 server 入口、无 RPC

## 非目标

- 不改宿主布局 / 间距 / timeline（`addTheme` 只能改颜色 token）
- 不提供自定义调色设置页

## 验收

- `npm run typecheck`、`npm test` 通过（测试校验每个颜色为冷纸 hex、accent=foreground、id 唯一、深浅各一）
- `paseo plugin ls` 中 `mono` 为 `running`
- Settings → Appearance 可选 Mono Dark / Mono Light，切换后文本、面板、终端配色正常
