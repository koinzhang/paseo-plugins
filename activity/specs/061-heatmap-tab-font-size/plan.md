# 061 — Plan

## 1. 改动面

`client/activity-heatmap.tsx` 单文件：

- 新增模块常量 `LABEL_FONT_SIZE = 12`（含一行注释说明 tab 与轴同属次级标签）。
- mode tabs：`fontSize: compact ? 13 : 15` → `fontSize: LABEL_FONT_SIZE`。
- 月份标签：字面量 `12` → `LABEL_FONT_SIZE`（值不变，只是与 tab 绑定同一来源）。

## 2. 取舍

- **共享常量而非两处字面量**：需求是「一样大」，同源常量让后续改一处即同步，避免再次漂移。
- **不随 compact 缩放**：月份标签本身就不缩放，若 tab 缩放则窄面板下又不同高，回到原问题。
- **不动 `paddingVertical`**：6 是点击热区，与字号无关；改小会让三档更难点。

## 3. 验证

- `npm run typecheck`
- `paseo plugin reload activity` 后在 Global Activity 目视比对 tab 行与月份行
- `grep -n "fontSize" client/activity-heatmap.tsx` 确认无 `compact ? 13 : 15` 残留
