# 代码审查报告 — 2026-09-19

- 审查基线：HEAD `1dc0173`（"Make the Activity panel agent title open its conversation and remove markdown export."）
- 范围：全部 server / shared / client 代码 + specs 001–009 与代码的一致性
- 验证状态（审查时）：`npm run typecheck` 通过；`npm test` 87/87 通过
- 说明：审查时工作区已有未提交的 `rank-color` 相关改动，不在本报告范围内

> 存放约定：本报告是时间点质量快照，放 `docs/reviews/`；`specs/` 编号目录只承接功能点。
> 消化：已建 [`specs/012-review-remediation/`](../../specs/012-review-remediation/)；Spec 漂移已回改 001 / 007。
> **修复验证（2026-09-19）**：`npm run typecheck` 通过；`npm test` 98/98 通过。

---

## 消化状态总览

| 编号 | 结论 | 状态 |
|---|---|---|
| B1 | 属实：export 丢弃 markdown | **已修复** — CC 命令 `copyText(result.markdown)` |
| B2 | 属实：任意路径可读 | **已修复** — SKILL.md + roots 校验 + 512KiB 上限 |
| B3 | 属实：hooks 早退 | **已修复** — 外层 guard / 内层无条件 hooks |
| B4 | 属实：COALESCE 残留 | **已修复** — category 变化时覆盖依赖字段 |
| B5 | 属实：canonical hash 跨 epoch | **已修复** — 读 `sync_state.epoch`，替换时删 `canonical:%` |
| P1 | 属实：全表扫 | **已修复** — agentId / from-to 等下推 SQL WHERE |
| P2 | 属实：重复 list / 扫盘 | **已修复** — list 复用 + MCP/plugin roots TTL |
| P3 | 属实：root readdir 重复 | **已修复** — root listing TTL 缓存 |
| P4 | 属实：pill 白拉 summary | **已修复** — 去掉 pill 的 summary RPC |
| P5 | 属实：panel 默认 retry:3 | **已修复** — panel / read-skill `retry: false` |
| Spec 漂移 | 属实 | **已回改** — 001 US-5/7/8；007 §5 |
| 死代码 | 属实 | **已清理**（sync_state 保留并用于 B5） |
| 次要 1–4,6–7 | 属实 | **已修复** |
| 次要 5（JSONL 膨胀） | 属实，影响有限 | **延后**（默认 sqlite） |

---

## 一、Bug / 缺陷

### B1. 「Export activity report」命令产出被丢弃（P0，HEAD 引入） — ✅ 已修复

原问题：`index.client.tsx` 拿到 markdown 后丢弃并 `openPanel`。

修复：命令内 `await copyText(result.markdown)`；失败抛错由宿主 toast。Panel 导出按钮仍不恢复（与 HEAD 意图一致；001 US-8 已改）。

### B2. `usage.read-skill` 可读取任意文件（P1） — ✅ 已修复

原问题：仅校验空串与 `\0`。

修复：路径须以 `SKILL.md` 结尾；落在 home/plugin skill roots 或 `DEFAULT_SKILL_ROOTS` 匹配内；`realpath` 防 symlink 逃逸；512KiB 上限。

### B3. `UsagePopover` 违反 React hooks 规则（P2） — ✅ 已修复

修复：外层 `UsagePopover` 做 context guard；内层 `UsagePopoverAgent` 无条件调 hooks。

### B4. 重分类翻转时字段残留（P2） — ✅ 已修复

修复：SQLite UPSERT 与 JSONL `mergeRow` 在 `category` 变化时覆盖 confidence / skill_* / mcp_* / command / file_path。

### B5. 无 id 消息的幂等键跨 epoch 替换会重复（P3） — ✅ 已修复

修复：`resyncAgents` 比较 `getSyncState().epoch` 与新 cursor epoch；不一致则 `deleteCanonicalUserMessages`。

---

## 二、性能问题

### P1. 所有 SQLite 查询全表扫描 — ✅ 已修复

`tool_calls` / `user_messages` / `agents` 的 `select*` 将 agentId、workspace、category、时间窗等下推 WHERE；内存过滤仍作兜底（如 provider normalize）。

### P2. 后台重扫成本高 — ✅ 已修复

`check()` 将 `listed.entries` 传入 `resyncAgents`；`discoverPaseoPluginSkillRoots` / `resolveMcpServers` 加 60s TTL。

### P3. skill 路径解析每次查询重复扫目录 — ✅ 已修复

`resolveSkillMdPath` 对 root `readdir` 结果做 30s TTL。

### P4. Pill 查询拉了从不展示的 summary — ✅ 已修复

`useUsagePillData` 只拉 skills + mcp；`UsagePillData` 去掉 summary。

### P5. panel / read-skill 查询未禁自动重试 — ✅ 已修复

panel 两个轮询与 read-skill（panel + popover）均 `retry: false`。

---

## 三、Spec 漂移 — ✅ 已回改

| 位置 | 处置 |
|---|---|
| `001` US-7 | 改为指向 008 静默回填 |
| `001` US-8 / US-5 | 仅 Command Center 导出 + 剪贴板；无 panel 按钮 |
| `007` §5 | 勾选已完成项；删除 rescan；注明 008；Activity 命名残留随 012 改掉 |

### 死代码 — ✅ 已清理

- ~~`syncAgentsFromPaseo`~~ 已删
- ~~`useUsageSummary`~~ 已删
- `sync_state` / `getSyncState` — **保留并用于 B5**
- `classify.ts` 死 provider 字面量已清

---

## 四、次要问题

1. ✅ `rangeFrom` 不再冻结在 `useMemo([range])`；随轮询重算
2. ✅ `mix()` 忽略 8 位 hex alpha；tooltip 单复数
3. ✅ `removePill` 清理 `pillDataCache`
4. ✅ checkpoints 修剪已从 `agents.list` 消失的 id
5. ⏸ JSONL 无压缩 — 延后
6. ✅ `upsertUserMessages` 缓存 prepared statement
7. ✅ `pending-skill` 按 agentId 多槽位；peek + 延迟清理，避免 `openPanel` 重挂丢失详情

---

## 五、原建议处理顺序（归档）

已按 P0→P3 在 **012** 一并消化；未修项仅次要 #5。
