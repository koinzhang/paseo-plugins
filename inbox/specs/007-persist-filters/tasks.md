# 007 任务

- [x] `list-filters` settings：schema 默认值，以及全局 / 面板各自可见的筛选。`npm test` 32 项通过。
- [x] server `registerSettings`；列表用 `useSettings` 读写。分组、workspace、project chip 点选即保存。typecheck 通过。
- [x] 归档 workspace、⌘K 选中、新建笔记 / 收藏 agent 时按 spec 写回。`paseo plugin reload inbox` 后 running。app 内未手动点选。
- [x] 全局页面 `sort` 写入同一 settings（version 2，旧文档默认 updated）。Explorer 面板仍按修改时间。typecheck + `npm test` 通过，reload 后 running。app 内未手动点选。
