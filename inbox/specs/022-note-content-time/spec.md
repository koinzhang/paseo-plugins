# 022 Note content update time

## 目标

- note 的 `updatedAt` 只表示标题或正文的最后实际变更时间。
- pin / unpin 和标签变化不改变 `updatedAt`；重复保存相同标题与正文也不改变。
- New note 使用与 Star / Sort 相同的普通边框图标按钮，不再使用绿色 primary 按钮。

## 已定决策

1. `updateNote` 先比较标题和正文，任一实际不同才更新字段、`updated_at` 并触发变更通知；完全相同则原样返回。
2. `update(pinned)` 和 `setTags` 不再写 `updated_at`，保留自身变更通知及置顶排序。
3. 新建 note 的创建时间仍同时初始化 `createdAt` / `updatedAt`，不做历史数据回填。
4. toolbar `New note` 去掉 `kind="primary"`，沿用默认 Button / Star 的尺寸、边框和前景色。

## 验收

- 标题变更、正文变更各自推进时间；相同内容保存保持时间。
- pin → unpin 和标签变更保持原时间，但 UI 刷新通知仍发送。
- New note 与 Star 同为默认图标按钮样式。
- typecheck、完整测试、diff check 通过，重载插件，不操作真实笔记或执行界面测试。
