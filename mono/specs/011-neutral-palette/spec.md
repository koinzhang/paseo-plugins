# 011 · Neutral Mono 调色板

本规格修订 001 的冷色纸感配色要求。主题 ID 与名称保持不变。

## 目标

- Mono Light / Dark 使用无色相的 Neutral 灰阶，所有基础主题色满足 R=G=B。
- 背景、组件、边框和文字使用不同灰阶；交互强调色仍使用前景色。
- 深色大面积背景用 `#0A0A0A`，正文用 `#EDEDED`；浅色背景用 `#FFFFFF`，正文用 `#171717`。
- Paseo 根据 `appearance` 派生的 success / warning / danger 语义色保持可用。

## 非目标

- 不改主题 ID、设置、布局或 Web 适配器行为。
- 不新增插件主题 API 未提供的独立语义色字段。

## 验收

- `npm run typecheck` 与 `npm test` 通过。
- Mono Light / Dark 可选；背景、组件、边框和文字有清晰层级，状态色仍表达语义。
