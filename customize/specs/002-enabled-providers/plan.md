# 002 — Plan

客户端通过 `paseo.providers.snapshot()` 读取当前 host 的 Provider 快照。`ProviderSnapshotEntry.enabled` 决定是否列出，`source` 为 `builtin` / `custom`；Customize 现有的唯一自定义 Provider 是 Cursor，其扫描规则对应 ACP。只在现有七个 scanner 支持的 ID 中筛选。使用定时刷新和手动刷新更新快照。

将快照映射为下拉选项放在纯函数中，去重、保留既有顺序，并按 Paseo label 展示名称。已保存选择如果不在可选列表中，用列表首项作为本次有效选择，不触发对禁用 Provider 的扫描。若列表为空，显示空状态。

下拉选项增加右侧来源文本，Project 下拉不受影响。
