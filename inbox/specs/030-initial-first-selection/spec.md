# 030 Initial global selection

## 需求

- 进入全局 Inbox，初始没有选中条目时，自动选中实际列表的第一项。

## 决策

1. 只在全局 surface 的 `selection === null` 且真实列表已返回时，选择当前排序和筛选结果的第一项。
2. 不选择 `keepPreviousData` 的旧列表，等待新查询结果；空列表不做选择。
3. 已有选中项、新建草稿、⌘K 请求不被覆盖；切换筛选后，当前已选条目不强制重置。
4. workspace Explorer 保持列表 / 详情两级，不自动进入详情。

## 验收

- 初次进入全局页显示第一项详情及选中状态；空列表仍为空状态。
- 加载期间、草稿、已有选择和 workspace 不自动选第一项。
- 纯函数覆盖初始、已有选择、旧数据、空列表及 workspace；完整离线检查、diff check 和 reload，不做界面测试。
