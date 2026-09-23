# 066 — 公共组件 · 浮动图表 tooltip · 文案随 app 语言

承接 065 §6 后续优化建议中的「状态组件」「图表 hover 反馈」「i18n」「popover 宽度」四项。

## 1. 背景

- Loading / Error / Empty、节标题 + 动作按钮、文字 tab、计数文本在 5+ 个文件重复实现；错误只显示 `error.message`，无重试
- 热力图、直方图用浮动 tooltip，Timeline 用底部 readout 行，三图 hover 反馈不一致
- 除时间戳（039）外文案全部硬编码英文；且旧 `useAppLanguage` 读 `<html lang>`，宿主固定写 `en`，实际从未跟随 app 语言
- Usage popover 宽 300–380，Attention popover min 240，两个浮层宽度不一致

## 2. 目标

1. **公共组件** `client/ui.tsx`：`IconButton`、`SectionHeader`、`Section`、`LoadingState`、`ErrorState`（带 Retry）、`InlineEmpty`、`PageEmpty`、`TextTabs`、`CountText`、`ChartTooltip`；三层 scope 与两个 popover 接入
2. **图表 tooltip 统一**：热力图 / 直方图 / Timeline 共用 `ChartTooltip`（标题 + 色块 · label · 数值行）；Timeline 去掉 readout 行改为浮动 tooltip
3. **热力图不加图例**（用户决定）；065 §6「图例」项关闭
4. **文案随 app 语言**：读取 Paseo 设置 `localStorage["@paseo:app-settings"].language`（`system` → `navigator.languages`），切换后无需 reload 即生效；覆盖 UI 文案、a11y label、Command Center 标题、attention pill 标题、KPI / insights / 时长
5. **浮层宽度统一**：两个 composer popover 共用 `popoverFrame(compact)`（regular 300–380，compact 由宿主铺满）

## 3. 非目标

- 除 en / zh-CN 外的 7 种 app 语言（ar / es / fr / ja / ko / pt-BR / ru）文案表：先回退英文，后续按需补
- 侧边栏 / workspace panel 标题：产品名 Activity 不翻译
- 065 §6 其余项（Global 页长度、workspace/panel 拆样式、品牌色对比度等）

## 4. 验收

- [ ] Paseo 设置切到「简体中文」后，Global / Workspace / Agent 三面、两个 popover、Command Center「工作区 Activity」即时变中文；切回 English 即时恢复
- [ ] 设置为「跟随系统」时按 OS 首选语言（zh-* → zh-CN，其它未支持语言 → en）
- [ ] 三个图表 hover 均出现同款浮动 tooltip，贴近指针且不溢出图表左右边界；Timeline 不再有底部 readout 行
- [ ] 查询失败显示「加载失败：原因 · 重试」，点重试重新请求
- [ ] 两个 popover regular 下宽度同为 300–380
