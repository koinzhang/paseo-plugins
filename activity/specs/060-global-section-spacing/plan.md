# 060 — plan

## 1. `client/activity-heatmap.tsx`

月份行与内层滚动内容各去掉一处固定留白：

```diff
-<View style={{ width: Math.max(0, axisWidth), paddingBottom: 4 }}>
+<View style={{ width: Math.max(0, axisWidth) }}>
...
-<View style={{ height: 24, marginTop: 10, flexDirection: "row", justifyContent: "space-between" }}>
+<View style={{ marginTop: 10, flexDirection: "row", justifyContent: "space-between" }}>
```

- 该行不 wrap、文字 `numberOfLines={1}`，高度只随字体（≈ 12px 文字 + `paddingVertical: 2`）
- tooltip 挂在 ScrollView 之外的根节点上，不依赖内层 padding

## 2. `client/hourly-activity-timeline.tsx`

根节点 gap 与热力图 / 直方图取同一 token：

```diff
-<View style={{ gap: compact ? 8 : 10 }} onLayout={...}>
+<View style={{ gap: compact ? 10 : 12 }} onLayout={...}>
```

标题 → 图表、图表 → readout 两处同时对齐，Timeline 内部节奏与相邻 section 一致。

## 3. `client/global-surface.tsx`

insights 与排行共用 `styles.block`，标题间距走同一个 token：

```diff
 titleRow: {
   ...
-  marginBottom: 10,
+  marginBottom: layout.compact ? 8 : 10,
 },
...
-<Text style={[styles.blockTitle, { marginBottom: 10 }]}>Activity insights</Text>
+<Text style={[styles.blockTitle, { marginBottom: layout.compact ? 8 : 10 }]}>Activity insights</Text>
```

- `block.gap: 2` 保留（行间也用它），因此标题到内容 = 2 + 8/10 = **10 / 12**
- `insightRow` / `rankRow` 的 `paddingVertical: 9` 不动，列表密度不变

## 4. 风险

| 风险 | 缓解 |
|---|---|
| 月份行失去固定高度后出现抖动 / 换行 | 行内不 wrap 且文字单行，高度只由字体决定；hover 只换颜色 |
| 顺手改掉列表行距 | §3 明确不动 `paddingVertical` 与 `block.gap`；diff 只含两处 margin token |
| 三个 token（10/12、8/10）被误读为随手值 | 代码注释与 spec §4 写明 8/10 + block gap 2 = 10/12 |
