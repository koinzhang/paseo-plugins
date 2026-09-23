# 065 — 设计规范统一（design tokens）

- 状态：已实现，页面验收待完成
- 日期：2026-09-24
- 依赖：003（视觉基线）、025（Explorer dense）、060（Global 节奏）、061（热力图 label 字号）
- 规范正文：[`docs/design-system.md`](../../docs/design-system.md)

## 1. 背景

64 个增量 spec 各自定视觉数值，宿主只给 `theme.colors` 与 `layout.compact`，其余全部散落在组件里。盘点（改动前）：

| 维度 | 现状 |
|---|---|
| 字号 | 8 种（9 / 11 / 12 / 13 / 14 / 15 / 16 / 19），同一角色跨面不同值 |
| 节标题 | Global 15·13 / 500；Workspace 16 / 600；Agent panel 14 与 15 两种 / 600；popover 14 / 600 |
| composer popover | Usage popover 行 13 / 11 / count 12、行距 10；Attention popover 行 14 / 12、行距 6 |
| 列表行内边距 | 6 / 9 / 10 / 12 |
| 页面 padding | Global 16·20；Workspace 16·24；Agent 16·28；section gap 24·32 / 20·26 / 20·28 |
| 圆角 | 10 种（3 / 3.5 / 6 / 6.5 / 7 / 8 / 9 / 10 / 12 / 20），tooltip 8 与 10 并存 |
| 图标 | 节标题动作 14 与 16 并存；popover 行首 16、panel 行首 18；分页按钮 28 vs 其它 24 |
| 空状态 | 图表内 14、列表内 13；错误文本不设字号 |
| MONO 字体 | 3 个文件各自定义 |

## 2. 目标

| ID | 目标 |
|---|---|
| G1 | 新增 `client/design-tokens.ts`：字号阶梯、文本角色、字重、页面布局、标题间距、行密度、圆角、图标 / 控件尺寸、tooltip 容器 |
| G2 | 全部 `.tsx` 改用 token；三层 scope 与 popover 同角色同值 |
| G3 | `docs/design-system.md` 作为唯一设计规范；旧 spec 中的视觉数值以它为准 |
| G4 | `design-tokens.test.ts` 进 `npm test`，拦截裸 `fontSize` / `fontWeight` / `borderRadius` / Icon `size` / `hitSlop` |

## 3. 非目标

- 不改颜色（已全部走 `theme.colors` / `mixColor` / `rank-color.ts`）
- 不改图表几何（格子、柱宽、图高、Timeline 斜线段）、KPI FitText 算法、菜单尺寸与行高
- 不改 i18n、交互行为、数据与 RPC
- 不抽共享 React 组件（Loading / Error / Empty）——见 §6 后续

## 4. 取值统一（可见变化）

| 项 | 改前 | 改后 |
|---|---|---|
| Global 节标题 | 15 / compact 13，500 | 15 / compact 14，600，−0.3 |
| Workspace 节标题 | 16 | 15 / compact 14 |
| Agent panel 标题 | 14（详情）/ 15（列表） | 统一 `sectionTitle` |
| Global padding（regular） | 20 | 24 |
| Workspace section gap（regular） | 26 | 28 |
| Agent panel padding（regular） | 28 | 24 |
| Agent panel 行内边距 | 12 | 9（regular） |
| Usage popover 行 | 13 / 11 / count 12，行距 10，图标 16，root gap 16 | 14 / 12 / count 13，行距 6，图标 18，root gap 10（与 Attention popover 一致） |
| Usage popover 返回箭头 | 14，文字 12 | 16，文字 13（与 Agent panel 一致） |
| 创建直方图 tooltip | padding 12/8、圆角 10、行 13 | 与热力图同：10/6、8、12/16 |
| 图表内空状态 | 14 | 13 |
| Global 排行空状态 | 14 | 13 |
| Workspace / Agent 节「标题 → 内容」 | 固定 12 | 10 / 12（随 compact） |
| Workspace 分页按钮 | 28×28，图标 14 | 24×24，图标 16 |
| Workspace Agents 头部搜索 / 设置按钮图标 | 14 | 16（与其它节标题动作一致） |
| 错误 / Loading 文本 | 默认字号 | 13 |

## 5. 验收

- [x] `client/design-tokens.ts` 落地，全部 `.tsx` 无裸字号 / 字重 / 圆角 / 图标尺寸 / hitSlop（测试保证）
- [x] `docs/design-system.md` 覆盖字体、布局、圆角、图标控件、浮层、状态与检查清单
- [x] `npm run typecheck`、`npm test` 通过；reload 后 running
- [ ] 目测：Global / Workspace / Agent 三面节标题同级、节奏一致（regular + compact）
- [ ] 目测：两个 composer popover 行样式一致
- [ ] 目测：热力图与直方图 tooltip 外观一致

## 6. 后续优化建议（未实现，另起编号）

| 方向 | 问题 | 建议 |
|---|---|---|
| 状态组件 | Loading / Error / Empty 在 5 个文件各写一遍；错误直接显示 `error.message`，无重试 | 抽 `StateView`（spinner / 错误 + Retry / 空态），统一文案 |
| 图表 hover 反馈 | 热力图、直方图用浮动 tooltip，Timeline 用底部 readout 行 | 统一为一种；至少三图都有 readout 或都有 tooltip |
| 图例 | Timeline 用 ▲▼ 文字，直方图只在 tooltip 有色块，热力图无强度图例 | 加 Less → More 强度图例；图例统一色块 + label |
| i18n | 时间按 app 语言（039），其余文案硬编码英文，中文用户界面混排 | 引入文案表，跟随 `useAppLanguage` |
| Global 页长度 | KPI + 热力图 + 直方图 + Timeline + insights + 排行纵向堆叠，常需滚动 | 直方图与 Timeline 合并为「Trends」tab，或记忆滚动位置 |
| 可访问性 | KPI tile 无 `accessibilityLabel`；Global 筛选 tab 无 `tablist` 容器 | 补 label / role |
| 代码结构 | `workspace/panel.tsx` 1000+ 行，样式与逻辑混在一起 | 样式拆到 `workspace/styles.ts` |
| 品牌色对比度 | 部分 provider 浅色值（如 kilo `#F8F676`）在浅色主题上对比度低 | 按背景亮度校正或加描边 |
| popover 宽度 | Usage popover 300–380，Attention popover min 240 | 统一 popover 宽度区间 |
| 验收债 | 047 / 051 / 057–063 等仍「页面验收待完成」 | 结合本 spec 目测一并验收 |
