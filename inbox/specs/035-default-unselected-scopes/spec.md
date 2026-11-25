# 035 Default unselected Project and Workspace filters

## 需求

- 回滚 032 的默认全选：全局 Inbox 的 Project / Workspace 默认不勾选，勾选后才按对应标签过滤。
- 笔记更换 Project / Workspace 后，不依赖筛选选择同步更新也能在未筛选状态显示。

## 决策

1. host settings 升为 version 7：`projectKeys / workspaceIds` 恢复为默认空数组。v5 / v6 无法区分自动全选与手动全选，因此迁移时统一清空两个 scope 选择，保留 Types、面板 Types 和排序；更早的单选手动选择仍迁移为数组。
2. 移除根据标签列表自动填入全部 key / id 的逻辑，不再随标签或 Types 变化自动勾选。
3. 空数组、`null` / `undefined` 均不限制对应 scope；非空数组匹配选中标签或无对应标签，保留 033 的无标签可见规则。
4. ⌘K 选中、新建笔记和全局 Types 重置将两个数组清空，而非设为自动全选标记。
5. workspace Explorer 不使用全局 Project / Workspace 选择，行为不变。
6. 保留原失效标签清理；它只清除已不在当前标签列表中的手动选择，不会自动增加勾选。

## 验收

- 新设置和迁移后的设置默认不勾选 Project / Workspace，列表显示全部条目。
- 勾选 Project / Workspace 后按选中标签过滤，取消全部勾选后恢复显示全部。
- 笔记改标签后，在未筛选状态仍可见；手动筛选仍保持选中状态，无标签条目按 033 保留。
- 设置迁移与临时 SQLite 回归测试；完整离线检查、diff check、reload。
