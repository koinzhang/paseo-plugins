# Activity — 功能模块与架构

产品名 / 插件 ID：**Activity** / **`activity`**  
数据目录：`~/.paseo/plugin-data/activity/`（默认 SQLite `usage.db`）

## 1. 三层 Scope（产品面）

| Scope | 入口 | 主组件 | 聚合轴 | 时间窗 |
|---|---|---|---|---|
| **Global** | Sidebar `Activity` · Command Center `Activity` | `client/global-surface.tsx` | Provider | All / Today / 7D / 30D |
| **Workspace** | Explorer panel · CC `Workspace Activity` | `client/workspace-panel.tsx`（`client/workspace/`） | Agent | 固定 All（027：不恢复时间 chips） |
| **Agent** | Agent workspace tab · Composer pills · CC `Agent Activity` | `client/panel.tsx` + `pill.tsx` + `attention-pill.tsx`（040） | 本 agent 工具；同仓其它会话 attention 捷径 | 无（全程） |

```text
Global Activity     → 跨 workspace · 习惯 / provider 对比 · 热力图 / Insights / Models
Workspace Activity  → 单 workspace · Agents 运营（排序筛选归档）· KPI · Terminals（host SDK：列表 / 预览 / 关闭）· Top skills/MCP
Agent Activity      → 单 agent · 工具明细（Skills / MCP）· Pill 快捷入口
```

分工原则：

- Global = 习惯与 provider 对比（热力图、Insights、Models）
- Workspace = **竖向 Agents 运营页**（列表、搜索、筛选、归档、显示偏好）+ 本仓 KPI + 打开中的 Terminals（032，host SDK 直连：列表 / 预览 / 关闭，不进本地库）+ Agents 行实时 attention（033–036：pending permission 徽标、status 色、running spinner；目录 `agent_update` 加速，15s 轮询保证完整，038 不抢宿主 observation slot）；**不做**热力图 / provider·model 拆分 / 时间窗（024 / 027）
- Agent = 当前会话工具明细 + pill；Messages 计入 KPI（031），Models 仍仅全局（015）；UI 时间统一 `FormattedTime`（039）

产品定位已超出「纯统计」：Workspace 面把 activity 数据接到 agent 管理上。对外说明见 [`README.md`](../README.md)。

## 2. 技术分层

```text
client/          UI（按 scope）
shared/          RPC 契约（zod）+ 聚合纯函数（classify / usage / insights）
server/          handlers · store · ingest · background-sync · hooks
~/.paseo/.../    SQLite：tool_calls · user_messages · agents
```

**查询面以本地库为准**；Paseo timeline / `agents.list` 只作采集与回填 / 状态 enrichment，不在 UI 路径全量现算。Workspace Agents 行的 attention / lifecycle：目录 `paseo.agents.subscribe`（`agent_update`）增量更新状态缓存作加速，15s 轮询保证完整（035，038 修正：不调用 `list({ subscribe })`；按 placement `projectId` 过滤）。本地用量刷新（037，038 修正）：Agent / pill 订 `timeline` 真实 turn 终态事件；Workspace 仅为离开 `running`/`initializing` 的启发式提示；均 300ms + 2s settle，轮询兜底。Global 与 Terminals 仍靠轮询。Terminals 不经本地库，走 host `terminals.*`（032）。

### 正交事件维

| 维 | 表 | Spec |
|---|---|---|
| Tools | `tool_calls` | 001 (+014 shell/file) |
| Agents（创建） | `agents` | 005 |
| Messages | `user_messages`（含 model） | 006 / 015 |

### 过滤轴

`agentId` × `workspaceId` × `from`/`to` ×（全局）`provider`

| RPC | agentId | workspaceId | from/to | 主消费者 |
|---|---|---|---|---|
| `usage.summary` | ✓ | ✓ | ✓ | Agent / Workspace |
| `usage.skills-by-name` | ✓ | ✓ | ✓ | 三层 |
| `usage.mcp-by-tool` | ✓ | ✓ | ✓ | 三层 |
| `usage.by-provider` | — | ✓ | ✓ | Global |
| `usage.agents` | — | ✓ | ✓ | Workspace |
| `usage.host-info` | — | — | — | Workspace（cwd `~` 折叠） |
| `usage.activity-by-day` | — | ✓ | ✓ | Global |
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
| background-sync | 静默历史补扫（008）；`agents.list` 须翻页取全 |

## 5. 已知边界与债

| 项 | 说明 | Spec |
|---|---|---|
| Explorer 无热力图 / 无 provider·model | 窄栏不可读；全局已有 | 024 NG2/NG3 |
| Workspace 无时间窗 | 027 去掉；031 明确不恢复 | 027 / 031 |
| `usage.list` / `export` 无 workspaceId、无 UI | 契约稳定；非查询主路径 | 022 |
| Pill 幽灵层 | 宿主缺陷，插件不绕行 | 013 |
| Spec 编号 `027` 重复 | drop-header 与 agent-activity-title | 索引可读性 |
| 0.8 目录 observation 单 slot | 不调用 `agents.list({ subscribe })`；推送仅加速 | 038 |

演进与任务拆解见 [`specs/README.md`](../specs/README.md)；本文件描述稳定架构，细节以编号目录 `spec.md` / `plan.md` 为准。
