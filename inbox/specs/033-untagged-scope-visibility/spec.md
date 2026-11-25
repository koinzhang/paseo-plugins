# 033 Keep untagged items visible

## 需求

- 没有 Project 或 Workspace 的条目不被对应的 Project / Workspace 筛选过滤。
- 只影响多选 scope 筛选；workspace Explorer 的归属范围不变。

## 决策

1. Project 条件由 `project_key IN (...)` 改为 `(project_key IN (...) OR project_key IS NULL)`。
2. Workspace 条件由 `workspace_id IN (...)` 改为 `(workspace_id IN (...) OR workspace_id IS NULL)`。
3. 已设置但未勾选的标签仍排除；有 Project、无 Workspace 的条目不受 Workspace 选择限制，有 Workspace、无 Project 的旧数据同理。
4. 035 起显式空数组恢复为不限制；非空数组才按选中标签过滤。
5. null / undefined 仍不限制，旧单选输入仍保持原有过滤语义。

## 验收

- 多选 Project 时无 Project 条目保留，多选 Workspace 时无 Workspace 条目保留。
- 未选中的有标签条目被排除，Types / 搜索 / workspace inboxOf 行为不变。
- 临时 SQLite 测试覆盖双维度及空数组，完整离线检查、diff check、reload；不做界面测试。
