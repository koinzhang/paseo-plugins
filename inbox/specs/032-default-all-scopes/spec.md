# 032 Default all Project and Workspace selections

> 035 已按用户要求回滚本规格；此文件仅保留历史决策。

## 需求

- 全局 Inbox 的 Project 和 Workspace 默认全部勾选，而不是默认全部不勾选。
- 不显示 All 选项，各标签仍独立多选。

## 决策

1. host settings 升为 version 6：`projectKeys / workspaceIds` 可空。`null` 表示尚未初始化，client 根据真实标签列表填入全部 key / id 并保存。
2. 旧 v5 的空数组保留为不过滤，非空数组保持用户已有的部分选择；新默认与重置使用 null 初始化当前全选。此前 v5 没有主动空选返回无匹配的语义。
3. 用户主动取消全部得到 `[]`，不自动恢复全选；033 起只显示无对应标签的条目。
4. `items.list` 的数组字段变为 nullable：null / undefined 不过滤；033 起非空数组匹配选中标签或无对应标签，空数组仅匹配无对应标签。
5. ⌘K 选中、新建笔记和 Types 改变时以 null 重置为当前类型下的全选；标签随 Types 变化而默认更新。
6. workspace Explorer 不使用全局 Project / Workspace 选择。

## 验收

- 初始 / 旧默认设置在真实数据返回后全部 Project / Workspace 显示 Check，列表显示全部。
- 部分选择保留，全部取消保持空结果，不被自动勾选覆盖。
- 无标签的数据库保存空数组；placeholder 不触发默认写入。
- 迁移、RPC 和临时 SQLite 回归测试；完整离线检查、diff check、reload，不做界面测试。
