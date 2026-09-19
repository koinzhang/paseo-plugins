# 012 — plan

## 修复要点

1. **B1** `index.client.tsx`：export 命令 `copyText(result.markdown)`，去掉无效 `openPanel`；失败 rethrow 让宿主 toast。
2. **B2** `createReadSkillHandler`：强制 `/SKILL.md$/i`、路径落在 `buildHomeSkillRoots`（含插件 skills）内、`stat`/`read` 上限 512KiB。
3. **B3** `UsagePopover` 拆外层 guard + 内层 hooks。
4. **B4** UPSERT / `mergeRow`：category 变化时 confidence / skill_* / mcp_* 取新值（可 null）。
5. **B5** `resyncAgents` 读 `getSyncState`；epoch 变则删该 agent 的 `canonical:%` 消息后再扫。
6. **P1** SqliteUsageStore 动态 WHERE（agent_id、COALESCE(ts,ingested_at)/created_at）。
7. **P2/P3** `ttlCache` 包装 `discoverPaseoPluginSkillRoots` / `resolveMcpServers`；`resyncAgents` 可传入已 list 的 entries。
8. **P4/P5** 去掉 pill summary RPC；panel 查询 `retry: false`。
9. 次要与死代码按 tasks 勾选。
