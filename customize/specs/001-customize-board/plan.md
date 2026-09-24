# 001 — Plan

## 架构

```
index.client.tsx
  addSurface("customize") + addSidebarItem("customize") → client/surface.tsx（看板，侧栏顶部导航入口）
  addCommandCenterItem("open-customize", global)       → openSurface("customize")
  trackWorkspaceRoute()               → client/web.ts：记录最后停留的 `/h/<server>/workspace/<id>`（surface 无 workspace 上下文）
index.server.ts
  customize.scan / customize.preview / customize.open → server/handlers.ts
shared/
  contracts.ts    RPC zod 契约 + Entry 类型
  selection-settings.ts  host 级 Provider / Project 选择设置
  providers.ts    provider 列表与标签
  mechanisms.ts   每家 × 每类「机制说明」（en / zh-CN，静态）
  i18n.ts         UI 文案
server/
  providers/<id>.ts   每家一个 scanner：给定 home / projectRoot → Entry[]
  scan-kit.ts         共用：skills 根扫描（一层 / 递归）、rules 目录、嵌套目录索引、上级目录链
  frontmatter.ts / toml.ts / yaml-lite.ts / jsonc.ts / glob.ts   轻量解析（零依赖）
  redact.ts           MCP 配置打码
  opener.ts           系统打开器
```

数据只读本机文件；server 进程运行在 daemon 机器上，`home` = `os.homedir()`，环境变量（`CODEX_HOME` / `PI_CODING_AGENT_DIR` / `COPILOT_HOME` / `XDG_CONFIG_HOME` / `OPENCODE_DISABLE_*`）取 daemon 环境。

## 数据模型

```ts
type Category = "instructions" | "rules" | "skills" | "mcp";
type Scope = "project" | "user";
type Status = "auto" | "conditional" | "manual" | "pending" | "disabled" | "inactive";

interface Entry {
  id: string;             // `${category}:${path}#${name}`
  category: Category;
  scope: Scope;
  name: string;
  description?: string;   // frontmatter description / MCP target
  path: string;           // 绝对路径（MCP = 配置文件）
  dir: string;            // 展示用目录（~ / 相对 project）
  source: string;         // 展示用来源根，如 `.agents/skills`、`~/.claude.json`
  status: Status;
  reason?: { code: ReasonCode; value?: string };
  tags: string[];         // legacy / managed / system / nested / command / symlink …
  mcp?: { name: string; transport: string; target: string };
}
```

`ReasonCode`：`frontmatter`（值为触发的键值）、`config`（配置片段）、`shadowedBy`、`nestedDir`、`globs`、`agentDecides`、`manualMention`、`always`、`untrusted`、`needsApproval`、`offByDefault`、`ignoredExt`、`env`、`oversize`、`onDemand`。客户端按语言格式化。

### 状态语义

| Status | 含义 | 例 |
|---|---|---|
| `auto` | 自动加载 / 模型可自动调用 | 普通 skill、alwaysApply rule、AGENTS.md |
| `conditional` | 满足条件才加载 | globs / paths、Agent 决定、嵌套目录、按需 |
| `manual` | 只能用户显式调用 | `disable-model-invocation`、`allow_implicit_invocation: false`、Cursor 无 description 的 rule |
| `pending` | 需用户批准 | Claude `.mcp.json` 未批准 |
| `disabled` | 被配置显式关闭 | `[[skills.config]] enabled=false`、`disabledMcpServers`、`permission.skill deny` |
| `inactive` | 存在但不会被读取 | 被 CLAUDE.md 遮蔽的 AGENTS.md、rules 目录里的 `.md`、默认关闭的来源 |

## RPC 契约

- `customize.scan` `{ provider, projectRoot: string | null }` → `{ provider, projectRoot, home, entries: Entry[], scannedAt }`
- `customize.preview` `{ path, mcpName? }` → `{ path, content, truncated, bytes, kind: "text" | "mcp" }`；path 必须在最近一次 scan 结果中（server 内存白名单），MCP 返回单 server 打码 JSON
- `customize.open` `{ path, reveal? }` → `{ ok: true }`；同一白名单

## 扫描规则要点

- cwd = projectRoot；「上级目录」= projectRoot 的祖先（到文件系统根，Claude / Pi 需要；Codex / OpenCode / Copilot 只到 git 根 = projectRoot）。
- 嵌套目录索引：从 projectRoot 广度优先，深度 ≤ 6、目录数 ≤ 4000，跳过 `node_modules`、`.git`、构建产物和其他隐藏目录（保留 `.claude` / `.cursor` / `.agents` / `.codex` / `.github` / `.opencode` / `.omp` / `.pi`）。
- 递归 skills 扫描：深度 ≤ 6，跳过隐藏目录，找到 `SKILL.md` 的目录不再下钻。
- 预览：≤ 64 KiB 且 ≤ 400 行。

## UI

沿用 Activity design tokens（`client/design-tokens.ts` 拷贝）与 `ui.tsx` 组件：

```
                                      Provider: Claude ▾   Project: paseo-plugins ▾  ⟳
Instructions 3 · Rules 2 · Skills 14 · MCP 5                     （TextTabs filter）
ⓘ 机制说明（可折叠：扫描位置 / 递归 / 自动发现开关）
项目
  ▢ AGENTS.md            [自动]   ./ · AGENTS.md
  ▢ deploy               [仅手动] .claude/skills/deploy · disable-model-invocation: true
用户
  …
────────── 预览（选中后出现；宽屏在下方，高度 40%） ──────────
path · 状态 · [打开] [在 Finder 中显示]
代码块（MONO，surface1 底）
```

筛选区作为 ScrollView 内容中的独立层叠容器，高于后续类别、机制说明和搜索栏；下拉菜单在该容器中定位。看板内容不再绘制 Customize 标题，入口标题由 Paseo 侧栏负责。

窄屏时 Provider 触发器靠左，菜单左对齐；Project 靠右，菜单保持右对齐。

Provider / Project 选择通过 `defineSettings` + `server.registerSettings` 存在当前 Paseo host，并由客户端 `useSettings` 读取和保存。`projectRoot: null` 表示尚未选择，继续按最后 workspace / 项目列表回退；空字符串表示用户明确选择「No project」。等待设置读取完成后再扫描，避免打开时短暂显示默认项。
