# 061 — Tasks

- [x] T1 抽出 `LABEL_FONT_SIZE`，mode tabs 与月份标签共用
  - 验证：`npm run typecheck` 通过；热力图内无 `compact ? 13 : 15`
- [x] T2 reload 后目视比对 tab 行与月份行
  - 验证：react-native-web harness（宽 784 / 窄 340）实测 tab 与 12 个月份标签 computed `font-size` 均为 12px；截图确认同高
