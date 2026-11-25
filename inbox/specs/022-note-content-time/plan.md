# 022 Plan

- 在 `InboxStore` 的 note 内容、标签和 pin 写入点分别处理时间，不用前端保存节流推断真实变更。
- 用临时 SQLite Store 回归测试时间戳、pin 和通知语义；不修改生产数据。
- toolbar 只移除 primary 样式，保留创建草稿与标签行为；图标由 024 改为 `FilePlus2`。
