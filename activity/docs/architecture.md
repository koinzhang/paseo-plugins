# Activity — 功能模块与架构

产品名 / 插件 ID：**Activity** / **`activity`**  
数据目录：`~/.paseo/plugin-data/activity/`（默认 SQLite `usage.db`）

## 1. 三层 Scope（产品面）

| Scope | 入口 | 主组件 | 聚合轴 | 时间窗 |
|---|---|---|---|---|
| **Global** | Sidebar `Activity` · Command Center `Activity` | `client/global-surface.tsx` | Provider 下拉（069） | 全部时间（069 移除 range chips） |
| **Workspace** | Explorer panel · CC `Workspace Activity` | `client/workspace-panel.tsx`（`client/workspace/`） | Agent | 固定 All（027：不恢复时间 chips） |
| **Agent** | Agent workspace tab · Composer pills · CC `Agent Activity` | `client/panel.tsx` + `pill.tsx` + `attention-pill.tsx`（040） | 本 agent 工具；同仓其它会话 attention 捷径 | 无（全程） |

```text
Global Activity     → 跨 workspace · 习惯 / provider 对比 · KPI 4 格（Sessions / Prompts / Top provider · 占比 / Top model · 占比 + 前 7 天对比，069/070/072/073）· 热力图 / 30 天直方图 / 168 小时 Timeline（各自 Sessions·Prompts·Skill·MCP 切换，070）· Providers / Projects 排行（069/070）· Insights 8 行（072）· Models
Workspace Activity  → 单 workspace · Agents 运营（排序筛选归档）· KPI · Terminals（host SDK：列表 / 预览 / 关闭）· Top skills/MCP
Agent Activity      → 单 agent · 工具明细（Skills / MCP）· Pill 快捷入口
```

分工原则：

- Global = 习惯与 provider 对比（KPI 前 7 天对比 073、热力图 / 直方图 / Timeline 指标切换 070、Providers / Projects 排行 069/070、Insights 072、Models）
- Workspace = **竖向 Agents 运营页**（列表、搜索、筛选、归档、显示偏好）+ 本仓 KPI + 打开中的 Terminals（032，host SDK 直连：列表 / 预览 / 关闭，不进本地库）+ Agents 行实时 attention（033–036：pending permission 徽标、status 色、running spinner；041：子 agent 数量角标，running 优先；043：`useAgent` 近实时 Closed / attention 字段；目录推送寄生宿主 observation，15s 轮询保证完整与 permissionCount，044 不在 client.paseo 再挂 observation）；**不做**热力图 / provider·model 拆分 / 时间窗（024 / 027）
- Agent = 当前会话工具明细 + pill；Prompts 计入 KPI（031；070 术语），Models 仍仅全局（015）；UI 时间统一 `FormattedTime`（039）

产品定位已超出「纯统计」：Workspace 面把 activity 数据接到 agent 管理上。对外说明见 [`README.md`](../README.md)。

## 2. 技术分层

```text
client/          UI（按 scope）；样式 token 见 design-tokens.ts / docs/design-system.md（065）；公共组件 ui.tsx（066）
shared/          RPC 契约（zod）+ 聚合纯函数（classify / usage / insights）+ 文案表 i18n.ts（066）
server/          handlers · store · ingest · background-sync · hooks
~/.paseo/.../    SQLite：tool_calls · user_messages · agents
```

**查询面以本地库为准**；Paseo timeline / `agents.list` 只作采集与回填 / 状态 enrichment，不在 UI 路径全量现算。Workspace Agents 行的 attention / lifecycle 来自按 PaseoApi 实例独立拥有的目录 observation（047）；同实例共享、不同 surface 隔离，初始/重连全分页补全，15s 轮询兜底。status 与 archivedAt 只取明确字段，useAgent 空值与目录 remove 不推断 Closed/Archived。宿主 archivedAt 覆盖本地查询行，防止慢 RPC 覆盖新归档状态。本地用量刷新（037）：Agent / pill 订 `timeline` 真实 turn 终态事件（含 `subscription_restored`）；Workspace 仅为离开 `running`/`initializing` 的启发式提示；均 300ms + 2s settle，轮询兜底。Global 与 Terminals 仍靠轮询。Terminals 不经本地库，走 host `terminals.*`（032）。

### 正交事件维

| 维 | 表 | Spec |
|---|---|---|
| Tools | `tool_calls` | 001 (+014 shell/file) |
| Agents（创建） | `agents` | 005 |
| Prompts（Messages） | `user_messages`（含 model） | 006 / 015（070 起 UI 统称 Prompts） |

**Provider 归一**：按库中原始 provider id 聚合，`normalizeProvider` 不再把 `omp`（Oh My Pi）并入 `pi`（071）；无数据迁移。

### 过滤轴

`agentId` × `workspaceId` × `from`/`to` ×（全局）`provider`

| RPC | agentId | workspaceId | from/to | 主消费者 |
|---|---|---|---|---|
| `usage.summary` | ✓ | ✓ | ✓ | Agent / Workspace |
| `usage.skills-by-name` | ✓ | ✓ | ✓ | 三层 |
| `usage.recent-skill-calls` | — | 必填 | — | Workspace Skills 时间线 |
| `usage.recent-mcp-calls` | — | 必填 | — | Workspace MCP 时间线 |
| `usage.mcp-by-tool` | ✓ | ✓ | ✓ | 三层 |
| `usage.by-provider` | — | ✓ | ✓ | Global |
| `usage.by-project` | — | — | —（全时段） | Global（Projects 排行，provider 过滤；070） |
| `usage.agents` | — | ✓ | ✓ | Workspace |
| `usage.agent-lifetime` | — | — | —（全时段） | Global（最长寿命 049；072 加平均会话投入时长 + 多轮会话计数，provider 过滤；051 起含活跃 agent） |
| `usage.agent-creations` | — | — | ✓ | Global（Agent creations 直方图，日柱 provider 软渐变；051/055） |
| `usage.host-info` | — | — | — | Workspace（cwd `~` 折叠） |
| `usage.activity-by-day` | — | ✓ | ✓ | Global |
| `usage.activity-by-hour` | — | — | 固定 168h | Global（059；provider 过滤） |
| `usage.list` / `usage.export` | ✓ | — | ✓ | 无 UI（契约保留） |

## 3. 注册入口（`index.client.tsx`）

| Contribution | id / context |
|---|---|
| Surface + Sidebar | `activity` / global |
| Workspace panel | `usage` / agent |
| Workspace panel | `workspace-activity` / workspace · `locations: ["explorer"]` |
| Command Center | `open-usage-global` · `open-usage` · `open-workspace-activity` |
| Composer pills | per-agent Activity（用量）；per-agent Attention（040：同仓 finished/permission） |

## 4. 采集路径（`index.server.ts`）

| Hook | 写入 |
|---|---|
| `agent.created` / `agent.archived` / `agent.turn_ended` | agents +（turn）tool_calls / user_messages |
| background-sync | 静默历史补扫（008）；`agents.list` 须翻页取全；目录同步带 `includeArchived` 补归档元数据（049），归档 entry 不扫 timeline；分页 `workspaces.list` 记录活跃 workspace 的 project root（070） |
| store upsert（SQLite / JSONL） | 事件时间只变早：取更早 `ts`，拒绝晚于首次入库 `ingested_at` 的新值；启动时幂等清空晚于 `ingested_at` 的 `ts`（074） |
| 扫描后 / 启动时 | prompt 回放副本去重：同 agent 内删除 provider 回放行（与实时行相差 ≤ 2s）与匿名 `canonical:` 批次，保留实时行（075） |

## 5. 已知边界与债

| 项 | 说明 | Spec |
|---|---|---|
| Explorer 无热力图 / 无 provider·model | 窄栏不可读；全局已有 | 024 NG2/NG3 |
| Workspace 无时间窗 | 027 去掉；031 明确不恢复 | 027 / 031 |
| `usage.list` / `export` 无 workspaceId、无 UI | 契约稳定；非查询主路径 | 022 |
| Pill 幽灵层 | 宿主缺陷，插件不绕行 | 013 |
| Spec 编号 `027` 重复 | drop-header 与 agent-activity-title | 索引可读性 |
| 0.8 目录 observation 单 slot | 历史约束，当前不再兼容 | 038 |
| 0.9 独立 API observation | 每实例自持订阅，按引用计数释放；共享连接不共享监听器 | 047 |
| project 记录已删除的 agent 不可见 | daemon `collectFetchAgentsEntries` 解析不到 placement 就丢弃（本机 45/498）；插件不读宿主磁盘，由 `usage.agent-lifetime.sampleSize` 暴露基数 | 049 |
| Projects 归属依赖 cwd / workspace 记录 | 无 `cwd` 且不在已列出 workspace 下的会话归 Other；不回填已删除 agent（070） | 070 |
| 首次即以回放时间入库的行 | 未经 live 观察的行无信息源恢复真实时间，保持回放时刻（074 非目标） | 074 |
| prompt 去重只依据库内字段 | 不处理 provider 未持久化 / 无时间的实时行，不改 RPC 与 Prompts 计数口径（075 非目标） | 075 |

演进与任务拆解见 [`specs/README.md`](../specs/README.md)；本文件描述稳定架构，细节以编号目录 `spec.md` / `plan.md` 为准。
