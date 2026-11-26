# 038 Plan

1. 在 `client/inbox-surface.tsx` 用原 `heading` 样式派生无边框标题输入样式，保留 flex 与省略行为。
2. `Detail` 根据条目类型选择 note 标题输入框或 agent 静态标题，复用现有 `title` / `setTitle`。
3. `NoteEditor` 删除标题输入与分隔线；保留状态同步、防抖自动保存和离开时的保存。
4. 更新 README 中的详情描述，运行 typecheck、完整测试、diff check，reload 后通过实际界面检查标题输入和保存结果。
