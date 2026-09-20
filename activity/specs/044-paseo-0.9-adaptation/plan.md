# 044 — plan（047 审查后修订）

共享连接不等于共享 PaseoApi。beta.2 `createPaseoApi` 的 agentListeners 是实例私有的，只有该 API 自建 observation 才有事件。原“寄生宿主 observation”与禁止插件自建订阅的结论错误，已由 047 更正。

- `agent-directory.ts` 按 API 实例共享独立 includeArchived observation，直接消费 subscription snapshot/update。
- entry 与 surface 各自建立 observation；初始及重连分页补全，轮询 15s 兜底，最后消费者卸载即释放。
- status / archivedAt 以目录明确字段为准；不再用 useAgent 缓存、remove 或时间戳启发式推断。
- timeline 的 subscription_restored/error 处理保留；cleanup 调用 SDK 函数以捕获 release 错误。
- 最低版本与 SDK 均为 0.9.0-beta.2。

完整方案与验证见 ../047-beta2-observation-remediation/。
