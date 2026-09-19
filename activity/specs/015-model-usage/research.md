# 015 — Research

| 问题 | 结论 |
|---|---|
| 插件能否读 model | `agents.list` / agent snapshot 有 `model`；lifecycle hook agent **无** model 字段 |
| thinking | snapshot 有 `thinkingOptionId`；本版不做 |
| 历史精确性 | timeline 无 model；resync 只能打当前快照 |
| 切换事件 | `model_changed` 不进普通插件 lifecycle；按消息戳足够做 Most used |
