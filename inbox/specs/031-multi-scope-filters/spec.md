# 031 Multi-select Project and Workspace filters

## 需求

- 全局 Filter 菜单中 Project / Workspace 与 Agents / Notes 一样可多选，不再有 All projects / All workspaces。
- 032 起默认全部勾选；用户主动取消全部后无匹配。032 取代此处原“默认空数组不过滤”的决策。

## 决策

1. host settings 升级为 version 5：`projectKeys: string[]`、`workspaceIds: string[]`；032 再升级为 version 6 并增加 null 初始化语义。
2. 从旧文档迁移单个 key / id 为一项数组，其余字段保留；旧版本也统一转换，避免迁移后残留未知字段。
3. `items.list` 新增 `projectKeys?: string[]` / `workspaceIds?: string[]`，与原有单选输入兼容。032 规定 null 不限制、空数组无匹配、非空 SQL IN。
4. Project 和 Workspace 条件保持 AND，各自内部为 OR；workspace Explorer 仍由 inboxOf 决定范围，不使用全局多选。
5. 菜单逐行 toggle，不自动关闭；不渲染 All 行。归档标签保留删除线、计数和 Check。
6. 失效标签按数组分别移除；⌘K 选中和新建笔记将两个数组清空；默认选中第一项按筛选后的真实列表执行。

## 验收

- 多选 Project / Workspace 正确过滤、空数组显示全部；同一组多项取 OR，两组同时筛选取 AND。
- 旧单选设置迁移成数组，新设置和菜单不残留单选或 All 选项。
- workspace 面板、详情标签、默认首项选择不变。
- 纯函数 / 临时 SQLite 回归测试，完整离线检查、diff check 和 reload；不做界面测试。
