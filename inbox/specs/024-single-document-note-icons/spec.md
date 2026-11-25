# 024 Single-document note icons

## 目标

- 笔记图标采用单页文档轮廓，不再使用带笔记本 / 装订联想的 `Notebook*` 图标。
- 列表、筛选、Command Center 与新建笔记入口保持同一视觉语义。

## 决策

1. 笔记列表与 Notes 筛选统一使用 Lucide `FileText`：一页纸和文字行。
2. 新建笔记按钮与 Command Center 快捷入口统一使用 `FilePlus2`：文档加新增符号。
3. 保留现有按钮样式、尺寸、文案、点击行为与笔记数据结构。

## 验收

- 四处图标全部替换，无 `NotebookText` / `NotebookPen` 运行时代码残留。
- 宿主动态加载 Lucide 图标，图标名来自其公开组件；无自定义 SVG 或新增依赖。
- typecheck、完整测试、diff check 与插件 reload 通过；不做界面测试。
