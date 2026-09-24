# Activity — 设计规范

适用范围：`client/` 下全部 UI（Global surface、Workspace / Agent panel、composer popover、图表）。  
真相源：[`client/design-tokens.ts`](../client/design-tokens.ts)；`client/design-tokens.test.ts` 在 `npm test` 中禁止 `.tsx` 出现裸 `fontSize` / `fontWeight` / `borderRadius` / Icon `size` / `hitSlop` 数值。  
引入与取值变更：[`specs/065-design-tokens`](../specs/065-design-tokens/)。

## 1. 原则

1. **颜色只来自 `theme.colors`**（宿主主题）；派生色用 `color-mix.ts`（`mixColor` / `ACTIVITY_MIX_STEPS`），品牌 / 排名色只在 `rank-color.ts`。
2. **宿主只提供颜色与 `layout.compact`**；字号、间距、圆角、尺寸由插件 token 统一，不在组件里写数字。
3. **按角色取值，不按像素取值**：先判断文本 / 控件属于哪个角色，再用对应 token；没有合适角色时先改本文件与 token，再写代码。
4. 三层 scope 与 popover 共用同一套角色；差异只允许来自 `compact` 与 §3 的页面类型。

## 2. 字体

### 2.1 字号阶梯（`FONT_SIZE`）

| Token | px | 角色 |
|---|---|---|
| `badge` | 9 | 图标角标计数（子 agent 数） |
| `caption` | 11 | 胶囊徽标文字、密集图表刻度（Timeline 日刻度 / Now）、终端输出 |
| `label` | 12 | 行 meta、坐标轴、图例、tooltip、图表内 tab、KPI 标签 |
| `small` | 13 | 行内 empty / error / loading、行计数、搜索输入、返回链接、代码正文 |
| `body` | 14 | 行标题、insights / 排行行、筛选 tab、菜单项；compact 下的节标题 |
| `title` | 15 | 节标题（regular） |
| `metric` | 18 | KPI 数值（FitText 基准，可缩小到适配） |
| `display` | 19 | 整页空状态标题 |

### 2.2 文本角色（`TEXT` / `sectionTitle`）

| 角色 | 规格 | 颜色 |
|---|---|---|
| `sectionTitle(compact)` | 15（compact 14）/ 600 / letterSpacing −0.3 | `foreground` |
| `TEXT.rowTitle` | 14 / 500 | `foreground` |
| `TEXT.meta` | 12 | `foregroundMuted`（链接用 `accent`） |
| `TEXT.count` | 13 / tabular-nums | `foregroundMuted` |
| `TEXT.body` | 14 | insights label 用 muted，value 用 foreground |
| `TEXT.small` | 13 | empty / loading 用 muted，error 用 `statusDanger` |
| `TEXT.back` | 13 / 500 | `foregroundMuted` |
| `TEXT.pillBadge` | 11 / 600 / tabular | 状态色（如 `statusWarning`） |
| `TEXT.iconBadge` | 9 / 700 / tabular / lh 11 | `foregroundMuted` |
| `TEXT.tooltip` | 12 / lh 16 | 正文 foreground，日期等次要 muted |
| `TEXT.code` | 13 / lh 22 / MONO | `foreground`，底 `surface1` |
| `TEXT.terminal` | 11 / lh 15 / MONO | `foregroundMuted` |
| `TEXT.menu` | 14 / lh 18 / normal | label foreground，value muted |
| `TEXT.display` | 19 / 500 | `foreground` |

Global KPI 的上一窗口对比与 label 共用 `label` 12 的字体角色，宽窄屏均放在 label 下方；增长 / 下降分别用 `statusSuccess` / `statusDanger`，榜首名称和持平使用 `foregroundMuted`。

字重只用 `FONT_WEIGHT`：`regular` / `medium`（500）/ `semibold`（600）/ `bold`（700，仅图标角标）。

### 2.3 筛选与指标切换

- **Provider 筛选**（Global，069）：`ProviderDropdown` 触发器 `body` 14（`Provider:` muted + 当前值 semibold + `ChevronDown`），菜单行 `TEXT.menu`
- **指标切换**（图表 / 排行，070）：`MetricStepper` = `‹ 指标名 ›`，指标名 `body` 14 muted、`minWidth` 84，箭头用 `IconButton`（`ICON_SIZE.action`）
- `TextTabs`（`filter` / `chart`）保留在 `ui.tsx`；069 之后 Global 已无时间 / 图表模式 tab
- **排行展开 / 收起**（078）：行尾右对齐按钮，`body` 14 `foregroundMuted` + `ChevronUp` / `ChevronDown`（`ICON_SIZE.inline`），`ROW_PADDING.dense`；不新增 token

## 3. 布局与间距

### 3.1 页面容器（`pageLayout(kind, compact)`）

| kind | 用于 | padding | section gap |
|---|---|---|---|
| `surface` | Global 侧边栏页（图表、宽） | 16 / 24 | 24 / 32 |
| `panel` | Workspace / Agent workspace panel | 16 / 24 | 20 / 28 |

底部额外留白：surface `padding + 32`，panel `padding + 24`。最大宽度：surface 780，panel 1000。

### 3.2 节内节奏

- **标题 → 内容**：`titleGap(compact)` = 10 / 12；所有 section（图表、insights、排行、Agents、Terminals、Skills/MCP）一致
- **composer popover** 视为 compact：`sectionTitle(true)`、`titleGap(true)`
- **列表行垂直内边距**（`ROW_PADDING`）：
  - `regular` 9：Global insights / 排行、Agent panel Skills / MCP
  - `dense` 6：Workspace 运营列表（Agents / Terminals / Skills·MCP）、两个 composer popover
- 行内：图标 → 文本 gap 10–12；标题 → meta gap 3；行间 gap 2（dense 列表）/ 4（Agent panel）

## 4. 圆角（`RADIUS` / `pillRadius`）

| Token | px | 用于 |
|---|---|---|
| `swatch` | 3 | 直方图柱顶、图例色块 |
| `control` | 6 | 图标按钮、菜单行、终端预览 |
| `overlay` | 8 | 菜单浮层、图表 tooltip |
| `block` | 12 | SKILL.md 代码正文 |
| `card` | 20 | KPI 卡片 |
| `pillRadius(h)` | h / 2 | 胶囊徽标、搜索框、状态点、角标 |

热力图格子按格宽推导（`max(2, cell / 4)`），不走 token。

## 5. 图标与控件

| Token | px | 用于 |
|---|---|---|
| `ICON_SIZE.badge` | 12 | 胶囊徽标内（permission） |
| `ICON_SIZE.inline` | 14 | 输入框内 glyph、菜单选项 / 子菜单箭头、行尾动作（归档、关闭终端）、单行排行行首 |
| `ICON_SIZE.action` | 16 | 节标题动作、返回、分页、菜单勾选 |
| `ICON_SIZE.leading` | 18 | 双行列表行首（Agents、Skills、MCP、Terminals） |

- 图标按钮统一 `iconButton`：24×24、`RADIUS.control`、`hitSlop={CONTROL.hitSlop}`（8）→ 触控区 40
- 胶囊徽标高 `CONTROL.pillBadgeHeight`（18）

## 6. 浮层

- **图表 tooltip**：一律用 `ChartTooltip`（`client/ui.tsx`，066）— 容器 `tooltipSurface(colors)`（padding 10 / 6、`RADIUS.overlay`、`surface2` 底、1px `border`）；标题 medium 字重，行为「色块 · muted label · 等宽数值」；水平居中于指针并夹在图表内，垂直在锚点上方 8px。三个图表都用浮动 tooltip，不再用 readout 行；热力图不加强度图例
- **composer popover**：宽度 `popoverFrame(compact)` — regular 300–380（`POPOVER_WIDTH`），compact 由宿主铺满
- **菜单**：宽 `MENU_WIDTH`（232）、`RADIUS.overlay`、`surface1` 底、1px `border`、轻阴影；行高 compact 40 / regular 28
- **Provider 下拉**（069 / 077）：触发器右对齐于筛选行；浮层开在触发器下方并右对齐（向左展开），`minWidth` 200、`RADIUS.overlay`、`surface1`；web 用全屏透明 backdrop 点外部关闭；超过 10 行浮层内滚动

## 7. 状态

| 状态 | 规格 |
|---|---|
| 首次加载 | `LoadingState`；刷新时保留旧数据，不闪 spinner |
| 错误 | `ErrorState`：`TEXT.small` + `statusDanger`「加载失败：原因」+ accent「重试」（重新请求失败的查询） |
| 行内空 | `InlineEmpty`（图表 / 列表内） |
| 整页空 | `PageEmpty`：`TEXT.display` 标题 + `TEXT.body` muted 提示 |
| Agent attention | finished → `statusSuccess`、permission → `statusWarning`、error → `statusDanger`（034） |

## 8. 公共组件（`client/ui.tsx`，066）

优先复用，不要在页面里重写：`IconButton`、`SectionHeader`（标题 + 右侧动作）、`Section`、`LoadingState`、`ErrorState`、`InlineEmpty`、`PageEmpty`、`TextTabs`（`filter` / `chart`）、`MetricStepper`（指标切换，070）、`CountText`、`ChartTooltip`。

## 9. 文案

- 用户可见文案与 a11y label 全部来自 `shared/i18n.ts`：组件内 `useMessages()`，纯函数传 `locale` 调 `messagesFor(locale)`
- 语言跟随 Paseo 设置（`@paseo:app-settings.language`，`system` → OS 首选）；目前 en / zh-CN，其余回退英文
- 句式交给文案表（函数形式如 `lastUsed(time)`），不要在组件里拼接英文前后缀
- 新增 key 时 en / zh-CN 同步补（zh-CN 表类型强制完整）；产品名 Activity 不翻译

## 10. 新增 UI 检查清单

- [ ] 颜色全部来自 `theme.colors` / `mixColor` / `rank-color.ts`
- [ ] 字号 / 字重 / 圆角 / 图标尺寸 / hitSlop 用 token（`npm test` 会拦）
- [ ] 节标题用 `sectionTitle`，标题 → 内容用 `titleGap`
- [ ] 列表行选对 `ROW_PADDING` 密度
- [ ] 可点元素有 `accessibilityRole` / `accessibilityLabel`，图标按钮带 `hitSlop`
- [ ] 状态 / 节标题 / 图标按钮 / tooltip 用 `client/ui.tsx` 组件
- [ ] 文案走 `useMessages()`，中文界面下目测一遍
- [ ] compact 下目测一遍
