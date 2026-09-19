# 014 — Shell calls 与 File reads/writes 上 UI

- 状态：已实现
- 日期：2026-09-19
- 依赖：001（tool_calls 采集与分类）、011（KPI 横条）
- 关联：撤销 001 **NG10**（Shell 明细 UI）；文件类为 `category=regular` 的 `detail_type` 聚合

## 1. 背景

`tool_calls` 已入库 shell 与 read/edit/write 等，但主 UI（KPI / panel / 全局排行）只展示 Skill / MCP。导出报告有 Shell。  
另外，`shellCalls` 现按 `detailType === "shell"` 计数，会把 **shell 读 SKILL.md（category=skill, confidence=low）** 算进 Shell，与「Skill calls 不含 low」的口径冲突。

## 2. 目标

| ID | 目标 |
|---|---|
| G1 | 全局页采集 Shell / File：进 Insights（Coding vs chat）与导出；**不**做 Most used commands 排行 |
| G2 | Agent panel KPI 增加 Shell calls、File reads、File writes（本 agent） |
| G3 | （撤销）全局 Most used commands 列 — 首词聚合噪声大、习惯解读弱 |
| G4 | 统一互斥计入规则：low-skill shell **不**计入 Shell；skill 推断的 SKILL.md read **不**计入 File reads |
| G5 | Claude / Codex / Cursor(ACP) 在既有 `detail.type` 规范化下口径一致；漏报写入非目标说明 |
| G6 | 全局顶栏保持 6 项：Messages / Agents / Workspaces / Skill calls / MCP calls / Current streak；**Longest streak** 进 insights |

## 3. 非目标

| ID | 非目标 | 说明 |
|---|---|---|
| NG1 | 热力图着色改为含 shell/files | 仍用 skills+mcp；tooltip 可不扩 |
| NG2 | Pill label 含 shell/files | pill 仍只 skill/MCP |
| NG3 | Token / cost | 同 006 |
| NG4 | ACP 无法识别的 `other` 强制归类 | 继续漏报；不猜测 |
| NG5 | search / fetch / sub_agent 进 KPI | 本版只 read + write/edit/delete |
| NG6 | 新表或新采集路径 | 只改聚合与 UI |

## 4. 计入规则（互斥）

一行 tool_call **至多**落入下列 KPI 桶之一（skill/MCP 与本版新增桶）：

| 条件 | Skill calls | MCP calls | Shell calls | File reads | File writes |
|---|---|---|---|---|---|
| `category=skill` 且 confidence ∈ {exact, inferred} | ✓ | | | | |
| `category=skill` 且 confidence=low（含 shell 读 SKILL.md） | ✗（仍记 low 档，仅导出） | | **✗** | | |
| `category=mcp` | | ✓ | | | |
| `category=regular` 且 `detail_type=shell` | | | ✓ | | |
| `category=regular` 且 `detail_type=read` | | | | ✓ | |
| `category=regular` 且 `detail_type` ∈ {write, edit, delete} | | | | | ✓ |

形式化：

```text
isShellCall   = category === "regular" && detailType === "shell"
isFileRead    = category === "regular" && detailType === "read"
isFileWrite   = category === "regular" && detailType ∈ {write, edit, delete}
```

**禁止**再用「仅 `detailType === "shell"`」计 Shell（会双计 / 误计 low-skill）。

### Provider 说明

| Provider | Shell | File read/write | 注意 |
|---|---|---|---|
| Claude | `detail.type=shell`（如 Bash） | read / edit / write 等 | 稳 |
| Codex | shell / 文件工具 | 同左 | 稳 |
| Cursor / CodeBuddy (ACP) | 宿主将 kind（如 execute）映为 `detail.type`；本插件只认规范化后的 `shell` / `read` / `edit` / … | 同左 | title 空的 MCP 仍可能漏报（与本版无关）；若某类文件操作未映射到上述 type，则不计入（不猜测） |

Skill 路径（exact / inferred / low）不变；本版不改 classify 优先级，只改 **聚合是否把 low shell 算进 Shell**。

## 5. UI

### 5.1 全局 Activity KPI

顶栏固定 6 项（避免过密）：

- Messages · Agents · Workspaces · Skill calls · MCP calls · Current streak

Shell / File / Longest streak **不**进顶栏，见 §5.1b。

### 5.1b Activity insights（习惯优先 8 行，见 [010](../010-activity-insights/)）

Active days · Longest streak · Busiest day · Top provider · Messages per agent · Tools per message · **Coding vs chat**（shell+file 相对 messages）· Peak weekday。

三列上限均为 8。

### 5.2 Agent panel KPI

在 Skill calls / MCP calls / Tools explored 旁增加 Shell calls、File reads、File writes（本 agent）。数据可用修好的 `usage.summary`，或 panel 现有查询扩展。

### 5.3 Most used（skills / MCP only）

全局排行仅 **Most used skills** 与 **Most used MCP**（与 insights 同上限 8）。不展示 commands 首词排行；shell 仍入库、进 Coding vs chat / panel / 导出。

### 5.4 导出

Overview 已有 Shell；数值改用新口径。增加 File reads / File writes 行。Shell top 列表排除 low-skill。

## 6. 验收

- [x] low-skill（shell 读 SKILL.md）→ Skill low 有数；Shell calls **不**含该行；Skill calls KPI 仍不含 low
- [x] inferred read SKILL.md → Skill calls +1；File reads **不** +1
- [x] regular read / shell / edit → 分别进入对应聚合桶
- [x] 全局顶栏 6 项；insights 含 Shell calls / File ops / Longest streak；Most used commands；panel 仍有 Shell/File KPI
- [x] Claude / Codex / ACP 样例单测覆盖 classify 不变 + 新聚合互斥
- [x] `npm run typecheck`、`npm test` 通过；`paseo plugin reload activity`
